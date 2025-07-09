import { Router } from "express";
import {
    generateBiWeeklyApprovals,
    getPendingApprovals,
    processEarningsApproval,
    getTutorEarnings,
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

export default router; 