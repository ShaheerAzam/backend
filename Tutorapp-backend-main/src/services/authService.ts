import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { AdminModel, IAdmin } from "../models/admin";
import { StudentModel, IStudent } from "../models/student";
import { TutorModel, ITutor } from "../models/tutor";
import { LoginDto, RefreshTokenDto, LogoutDto } from "../dtos/authDto";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { logger } from "../utils/logger";
import type { SignOptions, Secret } from "jsonwebtoken";
import crypto from "crypto";
import { EmailService } from "./emailService";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userType: "admin" | "student" | "tutor";
  userId: string;
  name?: string;
  email: string;
  hourlyRate?: number;
}

export class AuthService {
  private async findUser(email: string): Promise<{
    user: IAdmin | IStudent | ITutor;
    userType: "admin" | "student" | "tutor";
  } | null> {
    const admin = await AdminModel.findOne({ email });
    if (admin) return { user: admin, userType: "admin" };

    const student = await StudentModel.findOne({ email });
    if (student) return { user: student, userType: "student" };

    const tutor = await TutorModel.findOne({ email });
    if (tutor) return { user: tutor, userType: "tutor" };

    return null;
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const userData = await this.findUser(dto.email);
    if (!userData) {
      logger.warn(`Login attempt with non-existent email: ${dto.email}`);
      throw new BadRequestError("Invalid email or password");
    }

    const { user, userType } = userData;

    // Verify password
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {

      logger.warn(`Invalid password for ${userType}: ${dto.email}`);
      throw new UnauthorizedError("Invalid email or password");
    }

    // Validate JWT secrets
    const accessSecret = process.env.JWT_ACCESS_SECRET as Secret;
    const refreshSecret = process.env.JWT_REFRESH_SECRET as Secret;
    if (!accessSecret || !refreshSecret) {
      logger.error("JWT secrets are not defined");
      throw new BadRequestError("Server configuration error");
    }

    const accessExpires = (process.env.JWT_ACCESS_EXPIRES_IN ||
      "15m") as SignOptions["expiresIn"];
    const refreshExpires = (process.env.JWT_REFRESH_EXPIRES_IN ||
      "7d") as SignOptions["expiresIn"];

    // build SignOptions objects once (keeps the call sites tidy)
    const accessOpts: SignOptions = { expiresIn: accessExpires };
    const refreshOpts: SignOptions = { expiresIn: refreshExpires };

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user._id.toString(), userType },
      accessSecret,
      accessOpts
    );

    const refreshToken = jwt.sign(
      { userId: user._id.toString(), userType },
      refreshSecret,
      refreshOpts
    );

    // Store refresh token
    user.refreshToken = refreshToken;
    await user.save();

    const nameField = userType === "admin" ? undefined : (userType === "student" ? (user as any).studentName : (user as any).fullName);
    const email = (user as any).email;
    const hourlyRate = userType === "tutor" ? (user as any).hourlyRate : undefined;

    logger.info(`Successful login for ${userType}: ${dto.email}`);
    return { accessToken, refreshToken, userType, userId: user._id.toString(), name: nameField, email, hourlyRate };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const refreshSecret = process.env.JWT_REFRESH_SECRET;
      if (!refreshSecret) {
        logger.error("JWT_REFRESH_SECRET is not defined");
        throw new BadRequestError("Server configuration error");
      }

      const decoded = jwt.verify(dto.refreshToken, refreshSecret) as {
        userId: string;
        userType: string;
      };
      const userData = await this.findUserByIdAndType(
        decoded.userId,
        decoded.userType
      );
      if (!userData) {
        logger.warn(`Invalid refresh token: user not found`);
        throw new UnauthorizedError("Invalid refresh token");
      }

      const { user, userType } = userData;

      if (user.refreshToken !== dto.refreshToken) {
        logger.warn(`Refresh token mismatch for ${userType}: ${user.email}`);
        throw new UnauthorizedError("Invalid refresh token");
      }

      const accessSecret = process.env.JWT_ACCESS_SECRET as Secret;
      const accessExpires = (process.env.JWT_ACCESS_EXPIRES_IN ||
        "15m") as SignOptions["expiresIn"];
      const accessOpts: SignOptions = { expiresIn: accessExpires };

      if (!accessSecret) {
        logger.error("JWT_ACCESS_SECRET is not defined");
        throw new BadRequestError("Server configuration error");
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: user._id.toString(), userType },
        accessSecret,
        accessOpts
      );

      const nameField = userType === "admin" ? undefined : (userType === "student" ? (user as any).studentName : (user as any).fullName);
      const email = (user as any).email;
      const hourlyRate = userType === "tutor" ? (user as any).hourlyRate : undefined;

      logger.info(`Access token refreshed for ${userType}: ${user.email}`);
      return {
        accessToken,
        refreshToken: dto.refreshToken,
        userType,
        userId: user._id.toString(),
        name: nameField,
        email,
        hourlyRate,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.warn(`Invalid refresh token: ${errorMessage}`);
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  async logout(dto: LogoutDto): Promise<void> {
    const userData = await this.findUser(dto.email);
    if (!userData) {
      logger.warn(`Logout attempt with non-existent email: ${dto.email}`);
      throw new BadRequestError("User not found");
    }

    const { user, userType } = userData;
    user.refreshToken = undefined; // Changed from null to undefined
    await user.save();

    logger.info(`Successful logout for ${userType}: ${dto.email}`);
  }

  private async findUserByIdAndType(
    userId: string,
    userType: string
  ): Promise<{
    user: IAdmin | IStudent | ITutor;
    userType: "admin" | "student" | "tutor";
  } | null> {
    if (userType === "admin") {
      const admin = await AdminModel.findById(userId);
      if (admin) return { user: admin, userType: "admin" };
    } else if (userType === "student") {
      const student = await StudentModel.findById(userId);
      if (student) return { user: student, userType: "student" };
    } else if (userType === "tutor") {
      const tutor = await TutorModel.findById(userId);
      if (tutor) return { user: tutor, userType: "tutor" };
    }
    return null;
  }

  async forgotPassword(email: string): Promise<void> {
    const userData = await this.findUser(email);
    if (!userData) {
      // Don't reveal if user exists or not for security
      logger.info(`Forgot password request for non-existent email: ${email}`);
      return;
    }

    const { user, userType } = userData;

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in user document
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Send email with reset link
    const emailService = new EmailService();
    const frontendUrl = process.env.FRONTEND_URL
    const resetLink = `${frontendUrl}/#/reset-password?token=${resetToken}`;

    logger.info(`Using frontend URL: ${frontendUrl} for password reset link`);

    await emailService.sendPasswordResetEmail({
      email,
      name: userType === "admin" ? "Admin" : userType === "student" ? (user as any).studentName : (user as any).fullName,
      resetLink
    });

    logger.info(`Password reset email sent to ${userType}: ${email}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find user by reset token
    let user = await AdminModel.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });
    let userType: "admin" | "student" | "tutor" = "admin";

    if (!user) {
      user = await StudentModel.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: new Date() }
      });
      userType = "student";
    }

    if (!user) {
      user = await TutorModel.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: new Date() }
      });
      userType = "tutor";
    }

    if (!user) {
      logger.warn(`Invalid or expired reset token: ${token}`);
      throw new BadRequestError("Invalid or expired reset token");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    logger.info(`Password reset successful for ${userType}: ${user.email}`);
  }
}
