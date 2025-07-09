import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { LoginDto, RefreshTokenDto, LogoutDto } from "../dtos/authDto";
import { logger } from "../utils/logger";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { AdminModel } from "../models/admin";
import { StudentModel } from "../models/student";
import { TutorModel } from "../models/tutor";

const authService = new AuthService();

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const dto: LoginDto = req.body;
    const { accessToken, refreshToken, userType, userId } =
      await authService.login(dto);
    res.status(200).json({
      message: "Login successful",
      data: { accessToken, refreshToken, userType, userId },
    });
  } catch (error) {
    logger.error(
      `Login error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error); // Pass error to middleware
  }
}

export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const dto: RefreshTokenDto = req.body;
    const { accessToken, refreshToken, userType, userId } =
      await authService.refreshToken(dto);
    res.status(200).json({
      message: "Token refreshed successfully",
      data: { accessToken, refreshToken, userType, userId },
    });
  } catch (error) {
    logger.error(
      `Refresh token error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error); // Pass error to middleware
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const dto: LogoutDto = req.body;
    await authService.logout(dto);
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    logger.error(
      `Logout error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error); // Pass error to middleware
  }
}

export async function getCurrentUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId, userType } = req.user!;
    let user;
    if (userType === "admin") {
      user = await AdminModel.findById(userId).select("email createdAt updatedAt");
    } else if (userType === "student") {
      user = await StudentModel.findById(userId).select("studentName email phoneNumber createdAt updatedAt");
    } else {
      user = await TutorModel.findById(userId).select("fullName email phoneNumber hourlyRate createdAt updatedAt");
    }
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User fetched", data: user });
  } catch (error) {
    logger.error(`Get current user error: ${error instanceof Error ? error.message : "Unknown error"}`, error);
    next(error);
  }
}
