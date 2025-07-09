import { Router } from "express";
import { login, refreshToken, logout, getCurrentUser } from "../controllers/authController";
import { validateRequest } from "../middleware/validateRequest";
import {
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
} from "../utils/validationSchemas";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/login", validateRequest(loginSchema), login);
router.post("/refresh", validateRequest(refreshTokenSchema), refreshToken);
router.post("/logout", validateRequest(logoutSchema), logout);
router.get("/me", authMiddleware(), getCurrentUser);

export default router;
