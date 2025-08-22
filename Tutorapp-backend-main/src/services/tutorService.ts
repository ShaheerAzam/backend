import { ITutor, TutorModel } from "../models/tutor";
import { ChangeTutorPasswordDto, CreateTutorDto } from "../dtos/tutorDto";
import bcrypt from "bcryptjs";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { logger } from "../utils/logger";
import { UpdateTutorProfileDto } from "../dtos/lessonDto";
import { generateTempPassword } from "../utils/passwordGenerator";
import { EmailService } from "./emailService";

export class TutorService {
  private emailService = new EmailService();

  async createTutor(dto: CreateTutorDto, sendWelcomeEmail: boolean = true): Promise<ITutor> {
    // Check for existing email
    const existingTutor = await TutorModel.findOne({ email: dto.email });
    if (existingTutor) {
      logger.warn(`Attempt to register with existing email: ${dto.email}`);
      throw new BadRequestError("Email already exists");
    }

    // Generate temporary password if not provided
    const tempPassword = dto.password || generateTempPassword();

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

    // Create tutor
    const tutor = new TutorModel({
      fullName: dto.fullName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      password: hashedPassword,
      hourlyRate: dto.hourlyRate,
      assignedLessons: [],
    });

    try {
      const savedTutor = await tutor.save();
      logger.info(`Tutor registered successfully: ${savedTutor.email}`);

      // Send welcome email with credentials
      if (sendWelcomeEmail) {
        try {
          await this.emailService.sendWelcomeEmail({
            email: savedTutor.email,
            name: savedTutor.fullName,
            role: "tutor",
            tempPassword: tempPassword,
            dashboardUrl: process.env.FRONTEND_URL || "https://portal.ebbasmattehjelp.com/",
          });
          logger.info(`Welcome email sent to tutor: ${savedTutor.email}`);
        } catch (emailError) {
          logger.error(`Failed to send welcome email to ${savedTutor.email}:`, emailError);
          // Don't fail the registration if email fails
        }
      }

      return savedTutor;
    } catch (error) {
      logger.error(`Failed to register tutor: ${dto.email}`, error);
      throw new BadRequestError("Failed to register tutor");
    }
  }

  async updateTutorProfile(
    tutorId: string,
    dto: UpdateTutorProfileDto,
    requesterId: string,
    requesterType: string
  ): Promise<ITutor> {
    if (requesterType !== "tutor" || requesterId !== tutorId) {
      logger.warn(
        `Unauthorized profile update attempt by ${requesterType}: ${requesterId}`
      );
      throw new UnauthorizedError("You can only update your own profile");
    }

    const tutor = await TutorModel.findById(tutorId);
    if (!tutor) {
      logger.warn(`Tutor not found: ${tutorId}`);
      throw new BadRequestError("Tutor not found");
    }

    if (dto.fullName) {
      tutor.fullName = dto.fullName;
    }
    if (dto.phoneNumber) {
      tutor.phoneNumber = dto.phoneNumber;
    }
    if (dto.password) {
      tutor.password = await bcrypt.hash(dto.password, 10);
    }

    try {
      await tutor.save();
      logger.info(`Tutor profile updated: ${tutorId}`);
      return tutor;
    } catch (error) {
      logger.error(
        `Failed to update tutor profile ${tutorId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
      throw new BadRequestError("Failed to update tutor profile");
    }
  }

  async updateTutor(tutorId: string, updateData: { fullName?: string; email?: string; phoneNumber?: string; hourlyRate?: number }): Promise<ITutor> {
    const tutor = await TutorModel.findByIdAndUpdate(
      tutorId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!tutor) {
      logger.warn(`Tutor not found for update: ${tutorId}`);
      throw new BadRequestError("Tutor not found");
    }

    logger.info(`Tutor updated by admin: ${tutorId}`);
    return tutor;
  }

  async deleteTutor(tutorId: string): Promise<void> {
    const tutor = await TutorModel.findByIdAndDelete(tutorId);

    if (!tutor) {
      logger.warn(`Tutor not found for deletion: ${tutorId}`);
      throw new BadRequestError("Tutor not found");
    }

    logger.info(`Tutor deleted by admin: ${tutorId}`);
  }

  async changeTutorPassword(tutorId: string, dto: ChangeTutorPasswordDto, requesterId: string, requesterType: string): Promise<ITutor> {
    if (requesterType !== 'tutor' || requesterId !== tutorId) {
      logger.warn(`Unauthorized password change attempt by ${requesterType}: ${requesterId}`);
      throw new UnauthorizedError('You can only change your own password');
    }

    const tutor = await TutorModel.findById(tutorId);
    if (!tutor) {
      logger.warn(`Tutor not found: ${tutorId}`);
      throw new BadRequestError('Tutor not found');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, tutor.password);
    if (!isPasswordValid) {
      logger.warn(`Invalid current password for tutor: ${tutorId}`);
      throw new BadRequestError('Current password is incorrect');
    }

    tutor.password = await bcrypt.hash(dto.newPassword, 10);

    try {
      await tutor.save();
      logger.info(`Tutor password changed: ${tutorId}`);
      return tutor;
    } catch (error) {
      logger.error(`Failed to change tutor password ${tutorId}: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
      throw new BadRequestError('Failed to change tutor password');
    }
  }
}
