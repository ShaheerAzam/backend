import { Router } from "express";
import { changeAdminPassword, getStats, listStudents, listTutors } from "../controllers/adminController";
import { validateRequest } from "../middleware/validateRequest";
import { authMiddleware } from "../middleware/authMiddleware";
import { changeAdminPasswordSchema } from "../utils/validationSchemas";

const router = Router();

router.patch(
  "/change-password",
  authMiddleware("admin"),
  validateRequest(changeAdminPasswordSchema),
  changeAdminPassword
);

router.get("/stats", authMiddleware("admin"), getStats);
router.get("/students", authMiddleware("admin"), listStudents);
router.get("/tutors", authMiddleware("admin"), listTutors);

export default router;
