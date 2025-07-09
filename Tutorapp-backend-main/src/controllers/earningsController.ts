import { Request, Response, NextFunction } from "express";
import { EarningsApprovalService } from "../services/earningsApprovalService";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { logger } from "../utils/logger";

const earningsApprovalService = new EarningsApprovalService();

// Generate bi-weekly approvals for all tutors (admin only)
export async function generateBiWeeklyApprovals(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (req.user!.userType !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        await earningsApprovalService.generateBiWeeklyApprovals();
        res.status(200).json({
            message: "Bi-weekly earnings approvals generated successfully",
        });
    } catch (error) {
        logger.error(
            `Generate bi-weekly approvals error: ${error instanceof Error ? error.message : "Unknown error"}`,
            error
        );
        next(error);
    }
}

// Get pending approvals (admin only)
export async function getPendingApprovals(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (req.user!.userType !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const pendingApprovals = await earningsApprovalService.getPendingApprovals();
        res.status(200).json({
            message: "Pending approvals fetched successfully",
            data: pendingApprovals,
        });
    } catch (error) {
        logger.error(
            `Get pending approvals error: ${error instanceof Error ? error.message : "Unknown error"}`,
            error
        );
        next(error);
    }
}

// Approve or reject earnings (admin only)
export async function processEarningsApproval(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (req.user!.userType !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const { approvalId } = req.params;
        const { decision } = req.body; // "approved" or "rejected"

        if (!["approved", "rejected"].includes(decision)) {
            return res.status(400).json({ message: "Invalid decision. Must be 'approved' or 'rejected'" });
        }

        const approval = await earningsApprovalService.approveEarnings(
            approvalId,
            req.user!.userId,
            decision
        );

        res.status(200).json({
            message: `Earnings ${decision} successfully`,
            data: {
                id: approval._id,
                status: approval.status,
                approvedAt: approval.approvedAt,
            },
        });
    } catch (error) {
        logger.error(
            `Process earnings approval error: ${error instanceof Error ? error.message : "Unknown error"}`,
            error
        );
        next(error);
    }
}

// Get tutor's earnings (for tutor dashboard)
export async function getTutorEarnings(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const tutorId = req.user!.userType === "tutor" ? req.user!.userId : req.params.tutorId;

        if (req.user!.userType !== "admin" && req.user!.userType !== "tutor") {
            return res.status(403).json({ message: "Access denied" });
        }

        if (req.user!.userType === "tutor" && req.user!.userId !== tutorId) {
            return res.status(403).json({ message: "Access denied" });
        }

        const earnings = await earningsApprovalService.getTutorEarnings(tutorId);
        res.status(200).json({
            message: "Tutor earnings fetched successfully",
            data: earnings,
        });
    } catch (error) {
        logger.error(
            `Get tutor earnings error: ${error instanceof Error ? error.message : "Unknown error"}`,
            error
        );
        next(error);
    }
} 