import { IStudent, StudentModel } from "../models/student";
import { ChangeStudentPasswordDto, CreateStudentDto, UpdateStudentProfileDto } from "../dtos/studentDto";
import bcrypt from "bcryptjs";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { logger } from "../utils/logger";
import { generateTempPassword } from "../utils/passwordGenerator";
import { EmailService } from "./emailService";

export class StudentService {
  private emailService = new EmailService();

  async createStudent(dto: CreateStudentDto, sendWelcomeEmail: boolean = true): Promise<IStudent> {
    // Check for existing email
    const existingStudent = await StudentModel.findOne({ email: dto.email });
    if (existingStudent) {
      logger.warn(`Attempt to register with existing email: ${dto.email}`);
      throw new BadRequestError("Email already exists");
    }

    // Generate temporary password if not provided
    const tempPassword = dto.password || generateTempPassword();

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

    // Create student
    const student = new StudentModel({
      studentName: dto.studentName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      password: hashedPassword,
      lessonsAssigned: [],
    });

    try {
      const savedStudent = await student.save();
      logger.info(`Student registered successfully: ${savedStudent.email}`);

      // Send welcome email with credentials
      if (sendWelcomeEmail) {
        try {
          await this.emailService.sendWelcomeEmail({
            email: savedStudent.email,
            name: savedStudent.studentName,
            role: "student",
            tempPassword: tempPassword,
            dashboardUrl: process.env.FRONTEND_URL || "https://portal.ebbasmattehjelp.com/",
          });
          logger.info(`Welcome email sent to student: ${savedStudent.email}`);
        } catch (emailError) {
          logger.error(`Failed to send welcome email to ${savedStudent.email}:`, emailError);
          // Don't fail the registration if email fails
        }
      }

      return savedStudent;
    } catch (error) {
      logger.error(`Failed to register student: ${dto.email}`, error);
      throw new BadRequestError("Failed to register student");
    }
  }

  async updateStudentProfile(
    studentId: string,
    dto: UpdateStudentProfileDto,
    requesterId: string,
    requesterType: string
  ): Promise<IStudent> {
    if (requesterType !== "student" || requesterId !== studentId) {
      logger.warn(
        `Unauthorized profile update attempt by ${requesterType}: ${requesterId}`
      );
      throw new UnauthorizedError("You can only update your own profile");
    }

    const student = await StudentModel.findById(studentId);
    if (!student) {
      logger.warn(`Student not found: ${studentId}`);
      throw new BadRequestError("Student not found");
    }

    if (dto.studentName) {
      student.studentName = dto.studentName;
    }
    if (dto.phoneNumber) {
      student.phoneNumber = dto.phoneNumber;
    }
    if (dto.password) {
      student.password = await bcrypt.hash(dto.password, 10);
    }

    try {
      await student.save();
      logger.info(`Student profile updated: ${studentId}`);
      return student;
    } catch (error) {
      logger.error(
        `Failed to update student profile ${studentId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
      throw new BadRequestError("Failed to update student profile");
    }
  }

  async updateStudent(studentId: string, updateData: { studentName?: string; email?: string; phoneNumber?: string }): Promise<IStudent> {
    const student = await StudentModel.findByIdAndUpdate(
      studentId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!student) {
      logger.warn(`Student not found for update: ${studentId}`);
      throw new BadRequestError("Student not found");
    }

    logger.info(`Student updated by admin: ${studentId}`);
    return student;
  }

  async deleteStudent(studentId: string): Promise<void> {
    const student = await StudentModel.findByIdAndDelete(studentId);

    if (!student) {
      logger.warn(`Student not found for deletion: ${studentId}`);
      throw new BadRequestError("Student not found");
    }

    logger.info(`Student deleted by admin: ${studentId}`);
  }

  async changeStudentPassword(studentId: string, dto: ChangeStudentPasswordDto, requesterId: string, requesterType: string): Promise<IStudent> {
    if (requesterType !== 'student' || requesterId !== studentId) {
      logger.warn(`Unauthorized password change attempt by ${requesterType}: ${requesterId}`);
      throw new UnauthorizedError('You can only change your own password');
    }

    const student = await StudentModel.findById(studentId);
    if (!student) {
      logger.warn(`Student not found: ${studentId}`);
      throw new BadRequestError('Student not found');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, student.password);
    if (!isPasswordValid) {
      logger.warn(`Invalid current password for student: ${studentId}`);
      throw new BadRequestError('Current password is incorrect');
    }

    student.password = await bcrypt.hash(dto.newPassword, 10);

    try {
      await student.save();
      logger.info(`Student password changed: ${studentId}`);
      return student;
    } catch (error) {
      logger.error(`Failed to change student password ${studentId}: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
      throw new BadRequestError('Failed to change student password');
    }
  }
}
