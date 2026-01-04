import mongoose, { FlattenMaps } from 'mongoose';
import { ProblemBank, IProblemBankDocument } from '../models/problem-bank.model';
import { Problem } from '../models/problem.model';
import type { CreateProblemBankInput, UpdateProblemBankInput } from '../validators/problem.validator';

// Type for lean documents returned by Mongoose (POJO without Mongoose methods)
type LeanProblemBank = FlattenMaps<IProblemBankDocument> & { _id: mongoose.Types.ObjectId };

export class ProblemBankService {
  // Create a new problem bank
  async create(
    input: CreateProblemBankInput,
    ownerId: string
  ): Promise<IProblemBankDocument> {
    const bank = await ProblemBank.create({
      ...input,
      ownerId: new mongoose.Types.ObjectId(ownerId),
      problemCount: 0,
    });
    return bank;
  }

  // Get problem bank by ID
  async getById(
    bankId: string,
    userId?: string
  ): Promise<IProblemBankDocument | null> {
    const bank = await ProblemBank.findById(bankId);
    if (!bank) return null;

    // Check access
    if (!this.canAccess(bank, userId)) {
      return null;
    }

    return bank;
  }

  // List problem banks for a user
  async list(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      includePublic?: boolean;
      search?: string;
    } = {}
  ): Promise<{
    items: LeanProblemBank[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, includePublic = true, search } = options;
    const skip = (page - 1) * limit;

    const query: mongoose.FilterQuery<IProblemBankDocument> = {
      $or: [
        { ownerId: new mongoose.Types.ObjectId(userId) },
        { sharedWith: new mongoose.Types.ObjectId(userId) },
      ],
    };

    if (includePublic) {
      query.$or?.push({ visibility: 'public' });
    }

    if (search) {
      query.$text = { $search: search };
    }

    const [items, total] = await Promise.all([
      ProblemBank.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<LeanProblemBank[]>(),
      ProblemBank.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  // Update problem bank
  async update(
    bankId: string,
    input: UpdateProblemBankInput,
    userId: string
  ): Promise<IProblemBankDocument | null> {
    const bank = await ProblemBank.findById(bankId);
    if (!bank) return null;

    // Check ownership
    if (bank.ownerId.toString() !== userId) {
      throw new Error('Not authorized to update this problem bank');
    }

    Object.assign(bank, input);
    await bank.save();
    return bank;
  }

  // Delete problem bank
  async delete(bankId: string, userId: string): Promise<boolean> {
    const bank = await ProblemBank.findById(bankId);
    if (!bank) return false;

    // Check ownership
    if (bank.ownerId.toString() !== userId) {
      throw new Error('Not authorized to delete this problem bank');
    }

    // Delete all problems in the bank
    await Problem.deleteMany({ bankId: new mongoose.Types.ObjectId(bankId) });

    // Delete the bank
    await ProblemBank.deleteOne({ _id: bankId });
    return true;
  }

  // Share problem bank with users
  async share(
    bankId: string,
    userIds: string[],
    ownerId: string
  ): Promise<IProblemBankDocument | null> {
    const bank = await ProblemBank.findById(bankId);
    if (!bank) return null;

    if (bank.ownerId.toString() !== ownerId) {
      throw new Error('Not authorized to share this problem bank');
    }

    bank.visibility = 'shared';
    bank.sharedWith = userIds.map(id => new mongoose.Types.ObjectId(id));
    await bank.save();
    return bank;
  }

  // Update problem count
  async updateProblemCount(bankId: string): Promise<void> {
    const count = await Problem.countDocuments({
      bankId: new mongoose.Types.ObjectId(bankId),
    });
    await ProblemBank.updateOne({ _id: bankId }, { problemCount: count });
  }

  // Check if user can access bank
  private canAccess(bank: IProblemBankDocument, userId?: string): boolean {
    if (bank.visibility === 'public') return true;
    if (!userId) return false;

    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (bank.ownerId.equals(userObjectId)) return true;

    if (bank.visibility === 'shared' && bank.sharedWith) {
      return bank.sharedWith.some(id => id.equals(userObjectId));
    }

    return false;
  }
}

export const problemBankService = new ProblemBankService();
