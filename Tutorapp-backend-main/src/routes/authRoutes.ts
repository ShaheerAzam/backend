import { Router } from "express";
import { login, refreshToken, logout, getCurrentUser, forgotPassword, resetPassword } from "../controllers/authController";
import { validateRequest } from "../middleware/validateRequest";
import {
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../utils/validationSchemas";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/login", validateRequest(loginSchema), login);
router.post("/refresh", validateRequest(refreshTokenSchema), refreshToken);
router.post("/logout", validateRequest(logoutSchema), logout);
router.post("/forgot-password", validateRequest(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validateRequest(resetPasswordSchema), resetPassword);
router.get("/me", authMiddleware(), getCurrentUser);

export default router;
