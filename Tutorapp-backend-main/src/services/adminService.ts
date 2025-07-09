import { AdminModel, IAdmin } from "../models/admin";
import { ChangeAdminPasswordDto } from "../dtos/adminDto";
import bcrypt from "bcryptjs";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { logger } from "../utils/logger";

export class AdminService {
  async initializeAdmin(email: string, defaultPassword: string): Promise<void> {
    // Check if admin already exists
    const existingAdmin = await AdminModel.findOne({ email });
    if (existingAdmin) {
      logger.info(`Admin already exists: ${email}`);
      return;
    }

    // Hash default password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    // Create admin
    const admin = new AdminModel({
      email,
      password: hashedPassword,
    });

    try {
      await admin.save();
      logger.info(`Admin initialized successfully: ${email}`);
    } catch (error) {
      logger.error(`Failed to initialize admin: ${email}`, error);
      throw new BadRequestError("Failed to initialize admin");
    }
  }

  async changePassword(dto: ChangeAdminPasswordDto): Promise<void> {
    const admin = await AdminModel.findOne({ email: dto.email });
    if (!admin) {
      logger.warn(`Admin not found for email: ${dto.email}`);
      throw new BadRequestError("Admin not found");
    }

    // Verify current password
    const isMatch = await bcrypt.compare(dto.currentPassword, admin.password);
    if (!isMatch) {
      logger.warn(`Invalid current password for admin: ${dto.email}`);
      throw new UnauthorizedError("Invalid current password");
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(dto.newPassword, saltRounds);

    // Update password
    admin.password = hashedNewPassword;
    try {
      await admin.save();
      logger.info(`Password changed successfully for admin: ${dto.email}`);
    } catch (error) {
      logger.error(`Failed to change password for admin: ${dto.email}`, error);
      throw new BadRequestError("Failed to change password");
    }
  }
}
