import { Router } from "express";
import {
    generateBiWeeklyApprovals,
    getPendingApprovals,
    processEarningsApproval,
    getTutorEarnings,
    getEnhancedEarningsData,
    processPeriodApproval,
    getEarningsConfig,
    updateEarningsConfig,
} from "../controllers/earningsController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Admin routes
router.post(
    "/generate-biweekly",
    authMiddleware("admin"),
    generateBiWeeklyApprovals
);

router.get(
    "/pending-approvals",
    authMiddleware("admin"),
    getPendingApprovals
);

router.patch(
    "/approval/:approvalId",
    authMiddleware("admin"),
    processEarningsApproval
);

// Enhanced earnings routes
router.get(
    "/enhanced-earnings",
    authMiddleware("admin"),
    getEnhancedEarningsData
);

router.patch(
    "/period-approval/:tutorId/:periodStart/:periodEnd",
    authMiddleware("admin"),
    processPeriodApproval
);

// Test email endpoint (for development only)
router.post("/test-email", authMiddleware("admin"), async (req, res) => {
    try {
        const { EmailService } = await import("../services/emailService");
        const emailService = new EmailService();

        // Test welcome email
        await emailService.sendWelcomeEmail({
            email: "test@example.com",
            name: "Test User",
            role: "tutor",
            tempPassword: "temp123",
            dashboardUrl: "https://shaheerazam.github.io/matte-hjelp-connect/"
        });

        res.status(200).json({ message: "Test email sent successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to send test email", error: error instanceof Error ? error.message : "Unknown error" });
    }
});

// Tutor routes
router.get(
    "/tutor-earnings",
    authMiddleware("tutor"),
    getTutorEarnings
);

// Admin can view any tutor's earnings
router.get(
    "/tutor-earnings/:tutorId",
    authMiddleware("admin"),
    getTutorEarnings
);

// Earnings configuration routes (admin only)
router.get(
    "/config",
    authMiddleware("admin"),
    getEarningsConfig
);

router.put(
    "/config",
    authMiddleware("admin"),
    updateEarningsConfig
);

export default router; 