import { Router } from "express";
import {
  registerTutor,
  updateTutorProfile,
  getTutorEarnings,
  updateTutor,
  deleteTutor,
  changeTutorPassword,
} from "../controllers/tutorController";
import { validateRequest } from "../middleware/validateRequest";
import {
  changeTutorPasswordSchema,
  createTutorSchema,
  updateTutorProfileSchema,
} from "../utils/validationSchemas";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post(
  "/register",
  authMiddleware("admin"),
  validateRequest(createTutorSchema),
  registerTutor
);

router.patch(
  "/profile",
  authMiddleware(),
  validateRequest(updateTutorProfileSchema),
  updateTutorProfile
);

router.get("/earnings", authMiddleware("tutor"), getTutorEarnings);

// Admin routes for managing tutors
router.put(
  "/:id",
  authMiddleware("admin"),
  updateTutor
);
router.delete(
  "/:id",
  authMiddleware("admin"),
  deleteTutor
);

router.patch('/change-password', authMiddleware(), validateRequest(changeTutorPasswordSchema), changeTutorPassword);

export default router;
