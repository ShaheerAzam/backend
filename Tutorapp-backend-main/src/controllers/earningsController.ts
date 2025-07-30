import { Request, Response, NextFunction } from "express";
import { EarningsApprovalService } from "../services/earningsApprovalService";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { logger } from "../utils/logger";
import { EarningsConfigModel } from "../models/earningsConfig";

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

// Get enhanced earnings data for admin dashboard
export async function getEnhancedEarningsData(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (req.user!.userType !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const enhancedData = await earningsApprovalService.getEnhancedEarningsData();
        res.status(200).json({
            message: "Enhanced earnings data fetched successfully",
            data: enhancedData,
        });
    } catch (error) {
        logger.error(
            `Get enhanced earnings data error: ${error instanceof Error ? error.message : "Unknown error"}`,
            error
        );
        next(error);
    }
}

// Approve or reject specific period earnings
export async function processPeriodApproval(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (req.user!.userType !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const { tutorId, periodStart, periodEnd } = req.params;
        const { decision } = req.body; // "approved" or "rejected"

        if (!["approved", "rejected"].includes(decision)) {
            return res.status(400).json({ message: "Invalid decision. Must be 'approved' or 'rejected'" });
        }

        const approval = await earningsApprovalService.processPeriodApproval(
            tutorId,
            periodStart,
            periodEnd,
            req.user!.userId,
            decision
        );

        res.status(200).json({
            message: `Period earnings ${decision} successfully`,
            data: approval,
        });
    } catch (error) {
        logger.error(
            `Process period approval error: ${error instanceof Error ? error.message : "Unknown error"}`,
            error
        );
        next(error);
    }
}

// Get earnings configuration (admin only)
export async function getEarningsConfig(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (req.user!.userType !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        let config = await EarningsConfigModel.findOne();
        if (!config) {
            // Create default configuration if none exists
            config = await EarningsConfigModel.create({
                inPersonBonus: 5,
                invoiceMarkup: 15,
            });
        }

        res.status(200).json({
            message: "Earnings configuration fetched successfully",
            data: {
                inPersonBonus: config.inPersonBonus,
                invoiceMarkup: config.invoiceMarkup,
            },
        });
    } catch (error) {
        logger.error(
            `Get earnings config error: ${error instanceof Error ? error.message : "Unknown error"}`,
            error
        );
        next(error);
    }
}

// Update earnings configuration (admin only)
export async function updateEarningsConfig(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (req.user!.userType !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const { inPersonBonus, invoiceMarkup } = req.body;

        // Validate input
        if (typeof inPersonBonus !== 'number' || inPersonBonus < 0) {
            return res.status(400).json({ message: "Invalid inPersonBonus value" });
        }

        if (typeof invoiceMarkup !== 'number' || invoiceMarkup < 0 || invoiceMarkup > 100) {
            return res.status(400).json({ message: "Invalid invoiceMarkup value (must be between 0 and 100)" });
        }

        let config = await EarningsConfigModel.findOne();
        if (!config) {
            config = await EarningsConfigModel.create({
                inPersonBonus,
                invoiceMarkup,
            });
        } else {
            config.inPersonBonus = inPersonBonus;
            config.invoiceMarkup = invoiceMarkup;
            await config.save();
        }

        res.status(200).json({
            message: "Earnings configuration updated successfully",
            data: {
                inPersonBonus: config.inPersonBonus,
                invoiceMarkup: config.invoiceMarkup,
            },
        });
    } catch (error) {
        logger.error(
            `Update earnings config error: ${error instanceof Error ? error.message : "Unknown error"}`,
            error
        );
        next(error);
    }
} 