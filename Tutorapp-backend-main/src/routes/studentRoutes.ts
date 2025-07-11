import { Router } from "express";
import {
  registerStudent,
  updateStudentProfile,
  updateStudent,
  deleteStudent,
  changeStudentPassword,
} from "../controllers/studentController";
import { validateRequest } from "../middleware/validateRequest";
import {
  changeStudentPasswordSchema,
  createStudentSchema,
  updateStudentProfileSchema,
} from "../utils/validationSchemas";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post(
  "/register",
  authMiddleware("admin"),
  validateRequest(createStudentSchema),
  registerStudent
);
router.patch(
  "/profile",
  authMiddleware(),
  validateRequest(updateStudentProfileSchema),
  updateStudentProfile
);

// Admin routes for managing students
router.put(
  "/:id",
  authMiddleware("admin"),
  updateStudent
);
router.delete(
  "/:id",
  authMiddleware("admin"),
  deleteStudent
);
router.patch('/change-password', authMiddleware(), validateRequest(changeStudentPasswordSchema), changeStudentPassword);

export default router;
