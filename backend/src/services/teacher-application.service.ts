import { TeacherApplication, ITeacherApplicationDocument, ApplicationStatus } from '../models/teacher-application.model';
import { User, UserRole } from '../models/user.model';
import mongoose from 'mongoose';
import { notificationService } from './notification.service';

export class TeacherApplicationService {
  /**
   * Submit a teacher application
   */
  async submitApplication(userId: string, reason: string): Promise<ITeacherApplicationDocument> {
    // Check if user exists and is a student
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'student') {
      throw new Error('Only students can apply to become teachers');
    }

    // Check if there's already a pending application
    const existingApplication = await TeacherApplication.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'pending',
    });

    if (existingApplication) {
      throw new Error('You already have a pending application');
    }

    // Create new application
    const application = await TeacherApplication.create({
      userId: new mongoose.Types.ObjectId(userId),
      reason,
      status: 'pending',
    });

    // Notify all admins about the new application
    await notificationService.notifyAdmins(
      'teacher_application_submitted',
      '新的教师申请 / New Teacher Application',
      `${user.nickname} 提交了教师申请 / ${user.nickname} submitted a teacher application`,
      { applicationId: application._id.toString(), userId, nickname: user.nickname },
      '/admin/applications'
    );

    return application;
  }

  /**
   * Get applications (for admin review)
   */
  async getApplications(
    status?: ApplicationStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<{ applications: ITeacherApplicationDocument[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }

    const [applications, total] = await Promise.all([
      TeacherApplication.find(query)
        .populate('userId', 'nickname email')
        .populate('reviewedBy', 'nickname')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      TeacherApplication.countDocuments(query),
    ]);

    return { applications, total };
  }

  /**
   * Get user's application history
   */
  async getUserApplications(userId: string): Promise<ITeacherApplicationDocument[]> {
    return TeacherApplication.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .populate('reviewedBy', 'nickname')
      .sort({ createdAt: -1 });
  }

  /**
   * Review an application (approve or reject)
   */
  async reviewApplication(
    applicationId: string,
    reviewerId: string,
    action: 'approve' | 'reject',
    reviewNote?: string
  ): Promise<ITeacherApplicationDocument> {
    const application = await TeacherApplication.findById(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'pending') {
      throw new Error('This application has already been reviewed');
    }

    // Update application status
    application.status = action === 'approve' ? 'approved' : 'rejected';
    application.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
    application.reviewedAt = new Date();
    if (reviewNote) {
      application.reviewNote = reviewNote;
    }
    await application.save();

    // If approved, upgrade user to teacher
    if (action === 'approve') {
      await User.findByIdAndUpdate(application.userId, { role: 'teacher' });
    }

    // Notify the applicant about the result
    const notificationType = action === 'approve'
      ? 'teacher_application_approved' as const
      : 'teacher_application_rejected' as const;

    const title = action === 'approve'
      ? '教师申请已通过 / Teacher Application Approved'
      : '教师申请已拒绝 / Teacher Application Rejected';

    const message = action === 'approve'
      ? '恭喜！您的教师申请已通过，现在可以创建题库和比赛了。 / Congratulations! Your teacher application has been approved. You can now create problem banks and competitions.'
      : `您的教师申请已被拒绝。${reviewNote ? `原因：${reviewNote}` : ''} / Your teacher application has been rejected.${reviewNote ? ` Reason: ${reviewNote}` : ''}`;

    await notificationService.createNotification({
      userId: application.userId.toString(),
      type: notificationType,
      title,
      message,
      data: { applicationId, action },
      actionUrl: action === 'approve' ? '/problems' : '/apply-teacher',
    });

    return application;
  }

  /**
   * Check if user has a pending application
   */
  async hasPendingApplication(userId: string): Promise<boolean> {
    const count = await TeacherApplication.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'pending',
    });
    return count > 0;
  }
}

export const teacherApplicationService = new TeacherApplicationService();
