import { Types } from "mongoose";
import { EarningsApprovalModel, IEarningsApproval } from "../models/earningsApproval";
import { LessonModel } from "../models/lesson";
import { TutorModel } from "../models/tutor";
import { logger } from "../utils/logger";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../utils/errors";
import { startOfWeek, endOfWeek, addWeeks, format, isAfter, isBefore } from "date-fns";

export class EarningsApprovalService {

    // Generate bi-weekly periods for all tutors
    async generateBiWeeklyApprovals(): Promise<void> {
        try {
            const tutors = await TutorModel.find();
            const now = new Date();

            for (const tutor of tutors) {
                await this.generateTutorBiWeeklyApproval(tutor._id.toString(), now);
            }

            logger.info("Bi-weekly earnings approvals generated for all tutors");
        } catch (error) {
            logger.error(
                `Failed to generate bi-weekly approvals: ${error instanceof Error ? error.message : "Unknown error"}`,
                error
            );
            throw error;
        }
    }

    // Generate bi-weekly approval for a specific tutor
    async generateTutorBiWeeklyApproval(tutorId: string, referenceDate: Date = new Date()): Promise<IEarningsApproval | null> {
        try {
            // Calculate current bi-weekly period (every two weeks starting from a reference Monday)
            const currentWeekStart = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday

            // Find the start of current bi-weekly period
            const weeksSinceEpoch = Math.floor((currentWeekStart.getTime() - new Date('2024-01-01').getTime()) / (1000 * 60 * 60 * 24 * 7));
            const biWeeklyPeriodNumber = Math.floor(weeksSinceEpoch / 2);
            const periodStart = addWeeks(new Date('2024-01-01'), biWeeklyPeriodNumber * 2);
            const periodEnd = addWeeks(periodStart, 2);

            // Don't generate future periods
            if (isAfter(periodStart, referenceDate)) {
                return null;
            }

            // Check if approval already exists for this period
            const existingApproval = await EarningsApprovalModel.findOne({
                tutorId: new Types.ObjectId(tutorId),
                periodStart,
                periodEnd,
            });

            if (existingApproval) {
                return existingApproval;
            }

            // Find completed lessons in this period
            const completedLessons = await LessonModel.find({
                tutorId: new Types.ObjectId(tutorId),
                status: "Completed",
                lessonDate: {
                    $gte: periodStart,
                    $lt: periodEnd,
                },
            }).populate("tutorId", "hourlyRate");

            if (completedLessons.length === 0) {
                return null; // No lessons to approve
            }

            // Calculate totals
            const totalHours = completedLessons.reduce((sum, lesson) => sum + lesson.duration / 60, 0);
            const tutor = await TutorModel.findById(tutorId);
            const totalAmount = totalHours * (tutor?.hourlyRate || 0);
            const lessonIds = completedLessons.map(lesson => lesson._id);

            // Create approval record
            const approval = new EarningsApprovalModel({
                tutorId: new Types.ObjectId(tutorId),
                periodStart,
                periodEnd,
                totalHours,
                totalAmount,
                lessonIds,
                status: "pending",
            });

            await approval.save();

            logger.info(
                `Created bi-weekly earnings approval for tutor ${tutorId}: ${format(periodStart, 'yyyy-MM-dd')} to ${format(periodEnd, 'yyyy-MM-dd')} - $${totalAmount}`
            );

            return approval;
        } catch (error) {
            logger.error(
                `Failed to generate tutor bi-weekly approval: ${error instanceof Error ? error.message : "Unknown error"}`,
                error
            );
            throw error;
        }
    }

    // Get all pending approvals (for admin)
    async getPendingApprovals(): Promise<any[]> {
        try {
            const pendingApprovals = await EarningsApprovalModel.find({ status: "pending" })
                .populate("tutorId", "fullName email")
                .sort({ createdAt: -1 });

            return pendingApprovals.map(approval => ({
                id: approval._id,
                tutorName: (approval.tutorId as any).fullName,
                tutorEmail: (approval.tutorId as any).email,
                periodStart: format(approval.periodStart, 'yyyy-MM-dd'),
                periodEnd: format(approval.periodEnd, 'yyyy-MM-dd'),
                totalHours: approval.totalHours,
                totalAmount: approval.totalAmount,
                lessonsCount: approval.lessonIds.length,
                createdAt: approval.createdAt,
            }));
        } catch (error) {
            logger.error(
                `Failed to get pending approvals: ${error instanceof Error ? error.message : "Unknown error"}`,
                error
            );
            throw new BadRequestError("Failed to fetch pending approvals");
        }
    }

    // Approve earnings (admin only)
    async approveEarnings(
        approvalId: string,
        adminId: string,
        decision: "approved" | "rejected"
    ): Promise<IEarningsApproval> {
        try {
            const approval = await EarningsApprovalModel.findById(approvalId);
            if (!approval) {
                throw new NotFoundError("Earnings approval not found");
            }

            if (approval.status !== "pending") {
                throw new BadRequestError("Earnings approval has already been processed");
            }

            approval.status = decision;
            approval.approvedBy = new Types.ObjectId(adminId);
            approval.approvedAt = new Date();

            await approval.save();

            logger.info(
                `Earnings approval ${approvalId} ${decision} by admin ${adminId}`
            );

            return approval;
        } catch (error) {
            logger.error(
                `Failed to ${decision} earnings: ${error instanceof Error ? error.message : "Unknown error"}`,
                error
            );
            throw error;
        }
    }

    // Get tutor's earnings history (approved and pending)
    async getTutorEarnings(tutorId: string): Promise<any> {
        try {
            const approvals = await EarningsApprovalModel.find({
                tutorId: new Types.ObjectId(tutorId),
            }).sort({ periodStart: -1 });

            const pendingTotal = approvals
                .filter(a => a.status === "pending")
                .reduce((sum, a) => sum + a.totalAmount, 0);

            const approvedTotal = approvals
                .filter(a => a.status === "approved")
                .reduce((sum, a) => sum + a.totalAmount, 0);

            const earningsHistory = approvals.map(approval => ({
                id: approval._id,
                periodStart: format(approval.periodStart, 'yyyy-MM-dd'),
                periodEnd: format(approval.periodEnd, 'yyyy-MM-dd'),
                totalHours: approval.totalHours,
                totalAmount: approval.totalAmount,
                status: approval.status,
                approvedAt: approval.approvedAt,
                lessonsCount: approval.lessonIds.length,
            }));

            return {
                pendingTotal,
                approvedTotal,
                earningsHistory,
            };
        } catch (error) {
            logger.error(
                `Failed to get tutor earnings: ${error instanceof Error ? error.message : "Unknown error"}`,
                error
            );
            throw new BadRequestError("Failed to fetch tutor earnings");
        }
    }
} 