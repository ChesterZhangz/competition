import mongoose, { FlattenMaps } from 'mongoose';
import { Problem, IProblemDocument } from '../models/problem.model';
import { problemBankService } from './problem-bank.service';
import type { CreateProblemInput, UpdateProblemInput, ProblemQueryInput } from '../validators/problem.validator';

// Type for lean documents returned by Mongoose (POJO without Mongoose methods)
type LeanProblem = FlattenMaps<IProblemDocument> & { _id: mongoose.Types.ObjectId };

export class ProblemService {
  // Create a new problem
  async create(input: CreateProblemInput, userId: string): Promise<IProblemDocument> {
    // Verify bank access
    const bank = await problemBankService.getById(input.bankId, userId);
    if (!bank) {
      throw new Error('Problem bank not found or access denied');
    }

    // Check ownership for writing
    if (bank.ownerId.toString() !== userId) {
      throw new Error('Not authorized to add problems to this bank');
    }

    const problem = await Problem.create({
      ...input,
      bankId: new mongoose.Types.ObjectId(input.bankId),
      tags: input.tags?.map(id => new mongoose.Types.ObjectId(id)),
    });

    // Update problem count
    await problemBankService.updateProblemCount(input.bankId);

    return problem;
  }

  // Get problem by ID
  async getById(problemId: string, userId?: string): Promise<IProblemDocument | null> {
    const problem = await Problem.findById(problemId).populate('tags');
    if (!problem) return null;

    // Check bank access
    const bank = await problemBankService.getById(problem.bankId.toString(), userId);
    if (!bank) return null;

    return problem;
  }

  // List problems with filters
  async list(
    query: ProblemQueryInput,
    userId: string
  ): Promise<{
    items: LeanProblem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      bankId,
      type,
      difficulty,
      tags,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const filter: mongoose.FilterQuery<IProblemDocument> = {};

    if (bankId) {
      // Verify bank access
      const bank = await problemBankService.getById(bankId, userId);
      if (!bank) {
        return { items: [], total: 0, page, limit };
      }
      filter.bankId = new mongoose.Types.ObjectId(bankId);
    }

    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (tags?.length) {
      filter.tags = { $in: tags.map(id => new mongoose.Types.ObjectId(id)) };
    }
    if (search) {
      filter.$text = { $search: search };
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      Problem.find(filter)
        .populate('tags')
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean<LeanProblem[]>(),
      Problem.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  // Update problem
  async update(
    problemId: string,
    input: UpdateProblemInput,
    userId: string
  ): Promise<IProblemDocument | null> {
    const problem = await Problem.findById(problemId);
    if (!problem) return null;

    // Check bank ownership
    const bank = await problemBankService.getById(problem.bankId.toString(), userId);
    if (!bank || bank.ownerId.toString() !== userId) {
      throw new Error('Not authorized to update this problem');
    }

    // Update problem - handle tags separately
    const { tags, ...restInput } = input;

    // Update non-tag fields
    Object.assign(problem, restInput);

    // Update tags if provided
    if (tags) {
      problem.tags = tags.map(id => new mongoose.Types.ObjectId(id));
    }

    await problem.save();
    return problem;
  }

  // Delete problem
  async delete(problemId: string, userId: string): Promise<boolean> {
    const problem = await Problem.findById(problemId);
    if (!problem) return false;

    // Check bank ownership
    const bank = await problemBankService.getById(problem.bankId.toString(), userId);
    if (!bank || bank.ownerId.toString() !== userId) {
      throw new Error('Not authorized to delete this problem');
    }

    await Problem.deleteOne({ _id: problemId });

    // Update problem count
    await problemBankService.updateProblemCount(problem.bankId.toString());

    return true;
  }

  // Duplicate problem
  async duplicate(problemId: string, targetBankId: string, userId: string): Promise<IProblemDocument> {
    const problem = await Problem.findById(problemId);
    if (!problem) {
      throw new Error('Problem not found');
    }

    // Check source bank access
    const sourceBank = await problemBankService.getById(problem.bankId.toString(), userId);
    if (!sourceBank) {
      throw new Error('Source problem bank not found or access denied');
    }

    // Check target bank ownership
    const targetBank = await problemBankService.getById(targetBankId, userId);
    if (!targetBank || targetBank.ownerId.toString() !== userId) {
      throw new Error('Target problem bank not found or not authorized');
    }

    // Create duplicate
    const duplicate = await Problem.create({
      bankId: new mongoose.Types.ObjectId(targetBankId),
      type: problem.type,
      difficulty: problem.difficulty,
      content: problem.content,
      options: problem.options,
      correctAnswer: problem.correctAnswer,
      answerExplanation: problem.answerExplanation,
      tags: problem.tags,
      source: problem.source,
      estimatedTime: problem.estimatedTime,
      points: problem.points,
    });

    // Update problem count
    await problemBankService.updateProblemCount(targetBankId);

    return duplicate;
  }

  // Create multiple problems in batch
  async createBatch(inputs: CreateProblemInput[], userId: string): Promise<IProblemDocument[]> {
    if (!inputs.length) {
      return [];
    }

    // All problems must be for the same bank
    const bankId = inputs[0].bankId;
    if (!inputs.every(input => input.bankId === bankId)) {
      throw new Error('All problems must belong to the same bank');
    }

    // Verify bank access
    const bank = await problemBankService.getById(bankId, userId);
    if (!bank) {
      throw new Error('Problem bank not found or access denied');
    }

    // Check ownership for writing
    if (bank.ownerId.toString() !== userId) {
      throw new Error('Not authorized to add problems to this bank');
    }

    // Create all problems
    const problems = await Problem.insertMany(
      inputs.map(input => ({
        ...input,
        bankId: new mongoose.Types.ObjectId(input.bankId),
        tags: input.tags?.map(id => new mongoose.Types.ObjectId(id)),
      }))
    );

    // Update problem count
    await problemBankService.updateProblemCount(bankId);

    return problems;
  }

  // Increment usage count
  async incrementUsageCount(problemId: string): Promise<void> {
    await Problem.updateOne(
      { _id: problemId },
      { $inc: { usageCount: 1 } }
    );
  }

  // Update correct rate
  async updateCorrectRate(problemId: string, isCorrect: boolean): Promise<void> {
    const problem = await Problem.findById(problemId);
    if (!problem) return;

    const currentRate = problem.correctRate || 0;
    const currentCount = problem.usageCount || 1;

    // Calculate new rate
    const newRate = ((currentRate * (currentCount - 1)) + (isCorrect ? 100 : 0)) / currentCount;

    await Problem.updateOne(
      { _id: problemId },
      { correctRate: newRate }
    );
  }
}

export const problemService = new ProblemService();
