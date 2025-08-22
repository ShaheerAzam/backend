import { ObjectId, Types } from "mongoose";
import { LessonModel, ILesson } from "../models/lesson";
import { StudentModel, IStudent } from "../models/student";
import { TutorModel, ITutor } from "../models/tutor";
import {
  CreateLessonDto,
  CreateLessonBundleDto,
  RescheduleLessonDto,
} from "../dtos/lessonDto";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { logger } from "../utils/logger";
import { EmailService } from "./emailService";

interface LessonResponse {
  lessonId: Types.ObjectId;
  lessonDate: Date;
  lessonTime: string;
  duration: number;
  level: string;
  topic: string;
  type: "online" | "in-person";
  location?: string;
  tutorId: Types.ObjectId;
  studentId: Types.ObjectId;
  tutorName?: string;
  studentName?: string;
  status: string;
  bundleId?: Types.ObjectId | null;
  tutorPaid?: boolean;
  cancelledAt?: Date;
}

// Type for populated lesson document after lean()
interface PopulatedLesson {
  lessonId: Types.ObjectId;
  lessonDate: Date;
  lessonTime: string;
  duration: number;
  status: string;
  level: string;
  topic: string;
  type: "online" | "in-person";
  location?: string;
  tutorId: { _id: Types.ObjectId; fullName: string };
  studentId: { _id: Types.ObjectId; studentName: string };
  bundleId?: Types.ObjectId | null;
  tutorPaid: boolean;
  cancelledAt?: Date;
  _id: Types.ObjectId;
  __v?: number;
}

export class LessonService {
  private emailService: EmailService;
  
  

  constructor() {
    this.emailService = new EmailService();
 
  }
  private async validateParticipants(
    tutorId: string,
    studentId: string
  ): Promise<void> {
    const tutor = await TutorModel.findById(tutorId);
    if (!tutor) {
      logger.warn(`Tutor not found: ${tutorId}`);
      throw new BadRequestError("Tutor not found");
    }

    const student = await StudentModel.findById(studentId);
    if (!student) {
      logger.warn(`Student not found: ${studentId}`);
      throw new BadRequestError("Student not found");
    }
  }

  private async checkTutorAvailability(
    tutorId: string,
    lessonDate: Date,
    lessonTime: string,
    duration: number
  ): Promise<void> {
    const lessonStart = new Date(lessonDate);
    const [hours, minutes] = lessonTime.split(":").map(Number);
    lessonStart.setHours(hours, minutes, 0, 0);

    const lessonEnd = new Date(lessonStart.getTime() + duration * 60 * 1000);

    const conflictingLessons = await LessonModel.find({
      tutorId,
      lessonDate: {
        $gte: new Date(lessonDate).setHours(0, 0, 0, 0),
        $lt: new Date(lessonDate).setHours(23, 59, 59, 999),
      },
      status: { $in: ["Incoming", "Active"] },
    });

    for (const lesson of conflictingLessons) {
      const existingStart = new Date(lesson.lessonDate);
      const [existingHours, existingMinutes] = lesson.lessonTime
        .split(":")
        .map(Number);
      existingStart.setHours(existingHours, existingMinutes, 0, 0);
      const existingEnd = new Date(
        existingStart.getTime() + lesson.duration * 60 * 1000
      );

      if (lessonStart < existingEnd && lessonEnd > existingStart) {
        logger.warn(
          `Tutor ${tutorId} is not available at ${lessonDate} ${lessonTime}`
        );
        throw new BadRequestError(
          "Tutor is not available at the specified time"
        );
      }
    }
  }

  private determineStatus(
    lessonDate: Date,
    lessonTime: string,
    duration: number = 0
  ): "Incoming" | "Active" | "Completed" {
    const now = new Date();
    const lessonDateTime = new Date(lessonDate);
    const [hours, minutes] = lessonTime.split(":").map(Number);
    lessonDateTime.setHours(hours, minutes, 0, 0);

    const lessonEndTime = new Date(lessonDateTime.getTime() + duration * 60 * 1000);

    if (now < lessonDateTime) {
      return "Incoming";
    } else if (now >= lessonDateTime && now < lessonEndTime) {
      return "Active";
    } else {
      return "Completed";
    }
  }

  async createLesson(
    dto: CreateLessonDto,
    requesterId: string,
    requesterType: string
  ): Promise<ILesson> {
    if (requesterType !== "admin" && requesterId !== dto.studentId) {
      logger.warn(
        `Unauthorized lesson creation attempt by ${requesterType}: ${requesterId}`
      );
      throw new UnauthorizedError(
        "Only the student or an admin can schedule a lesson"
      );
    }

    await this.validateParticipants(dto.tutorId, dto.studentId);

    const lessonDate = new Date(dto.lessonDate);
    await this.checkTutorAvailability(
      dto.tutorId,
      lessonDate,
      dto.lessonTime,
      dto.duration
    );

    const lesson = new LessonModel({
      lessonDate,
      lessonTime: dto.lessonTime,
      duration: dto.duration,
      level: dto.level,
      topic: dto.topic,
      type: dto.type,
      location: dto.location,
      tutorId: new Types.ObjectId(dto.tutorId),
      studentId: new Types.ObjectId(dto.studentId),
      status: this.determineStatus(lessonDate, dto.lessonTime, dto.duration),
      bundleId: null,
    });

    try {
      await lesson.save();
      await StudentModel.findByIdAndUpdate(dto.studentId, {
        $push: { lessonsAssigned: lesson._id },
      });
      await TutorModel.findByIdAndUpdate(dto.tutorId, {
        $push: { assignedLessons: lesson._id },
      });

      // Send email notifications
      try {
        const [tutor, student] = await Promise.all([
          TutorModel.findById(dto.tutorId),
          StudentModel.findById(dto.studentId)
        ]);

        if (tutor && student) {
          await this.emailService.sendLessonAssignmentEmail({
            tutorEmail: tutor.email,
            tutorName: tutor.fullName,
            studentEmail: student.email,
            studentName: student.studentName,
            lessonDate: lessonDate,
            lessonTime: dto.lessonTime,
            duration: dto.duration,
            level: dto.level,
            topic: dto.topic,
            type: dto.type,
            location: dto.location,
            dashboardUrl: process.env.FRONTEND_URL! 
          });
        }
      } catch (emailError) {
        logger.error(`Failed to send lesson assignment emails: ${emailError instanceof Error ? emailError.message : "Unknown error"}`);
        // Don't throw error for email failures, just log them
      }

      logger.info(
        `Lesson created: ${lesson._id} for student ${dto.studentId} with tutor ${dto.tutorId}`
      );
      return lesson;
    } catch (error) {
      logger.error(
        `Failed to create lesson: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
      throw new BadRequestError("Failed to create lesson");
    }
  }

  async createLessonBundle(
    dto: CreateLessonBundleDto,
    requesterId: string,
    requesterType: string
  ): Promise<ILesson[]> {
    if (requesterType !== "admin" && requesterId !== dto.studentId) {
      logger.warn(
        `Unauthorized lesson bundle creation attempt by ${requesterType}: ${requesterId}`
      );
      throw new UnauthorizedError(
        "Only the student or an admin can schedule a lesson bundle"
      );
    }

    await this.validateParticipants(dto.tutorId, dto.studentId);

    const bundleId = new Types.ObjectId();
    const lessons: ILesson[] = [];

    const firstLessonDate = new Date(dto.firstLessonDate);
    for (let i = 0; i < dto.numberOfLessons; i++) {
      const lessonDate = new Date(
        firstLessonDate.getTime() + i * 7 * 24 * 60 * 60 * 1000
      );
      await this.checkTutorAvailability(
        dto.tutorId,
        lessonDate,
        dto.lessonTime,
        dto.duration
      );

      const lesson = new LessonModel({
        lessonDate,
        lessonTime: dto.lessonTime,
        duration: dto.duration,
        level: dto.level,
        topic: dto.topic,
        type: dto.type,
        location: dto.location,
        tutorId: new Types.ObjectId(dto.tutorId),
        studentId: new Types.ObjectId(dto.studentId),
        status: this.determineStatus(lessonDate, dto.lessonTime, dto.duration),
        bundleId,
      });

      lessons.push(lesson);
    }

    try {
      await LessonModel.insertMany(lessons);
      const lessonIds = lessons.map((lesson) => lesson._id);
      await StudentModel.findByIdAndUpdate(dto.studentId, {
        $push: { lessonsAssigned: { $each: lessonIds } },
      });
      await TutorModel.findByIdAndUpdate(dto.tutorId, {
        $push: { assignedLessons: { $each: lessonIds } },
      });
      logger.info(
        `Lesson bundle created: ${bundleId} with ${dto.numberOfLessons} lessons`
      );
      return lessons;
    } catch (error) {
      logger.error(
        `Failed to create lesson bundle: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
      throw new BadRequestError("Failed to create lesson bundle");
    }
  }

  async getLessons(
    requesterId: string,
    requesterType: string
  ): Promise<LessonResponse[]> {
    try {
      let filter: any = {};
      if (requesterType === "student") {
        filter.studentId = new Types.ObjectId(requesterId);
      } else if (requesterType === "tutor") {
        filter.tutorId = new Types.ObjectId(requesterId);
      } // Admin gets all lessons, no filter

      const lessons = (await LessonModel.find(filter)
        .populate("tutorId", "fullName")
        .populate("studentId", "studentName")
        .sort({ lessonDate: 1 })
        .lean()) as any[];

      return lessons.map((lesson) => ({
        lessonId: lesson._id,
        lessonDate: lesson.lessonDate,
        lessonTime: lesson.lessonTime,
        duration: lesson.duration,
        level: lesson.level,
        topic: lesson.topic,
        type: lesson.type,
        location: lesson.location,
        tutorId: typeof lesson.tutorId === 'object' && lesson.tutorId !== null ? lesson.tutorId._id : lesson.tutorId,
        studentId: typeof lesson.studentId === 'object' && lesson.studentId !== null ? lesson.studentId._id : lesson.studentId,
        tutorName: typeof lesson.tutorId === 'object' && lesson.tutorId !== null ? lesson.tutorId.fullName : undefined,
        studentName: typeof lesson.studentId === 'object' && lesson.studentId !== null ? lesson.studentId.studentName : undefined,
        status: this.mapStatus(lesson.status),
        bundleId: lesson.bundleId,
        tutorPaid: lesson.tutorPaid,
        cancelledAt: lesson.cancelledAt,
      }));
    } catch (error) {
      logger.error(
        `Failed to fetch lessons for ${requesterType} ${requesterId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
      throw new BadRequestError("Failed to fetch lessons");
    }
  }

  async rescheduleLesson(
    lessonId: string,
    dto: RescheduleLessonDto,
    requesterId: string,
    requesterType: string
  ): Promise<ILesson> {
    if (requesterType !== "admin" && requesterType !== "tutor") {
      logger.warn(
        `Unauthorized reschedule attempt by ${requesterType}: ${requesterId}`
      );
      throw new UnauthorizedError(
        "Only admins or tutors can reschedule lessons"
      );
    }

    const lesson = await LessonModel.findById(lessonId);
    if (!lesson) {
      logger.warn(`Lesson not found: ${lessonId}`);
      throw new BadRequestError("Lesson not found");
    }

    if (
      requesterType === "tutor" &&
      lesson.tutorId.toString() !== requesterId
    ) {
      logger.warn(
        `Tutor ${requesterId} not authorized to reschedule lesson ${lessonId}`
      );
      throw new UnauthorizedError(
        "You are not the assigned tutor for this lesson"
      );
    }

    const oldDate = lesson.lessonDate;
    const oldTime = lesson.lessonTime;
    const newDate = dto.newDate ? new Date(dto.newDate) : lesson.lessonDate;
    const newTime = dto.newTime || lesson.lessonTime;

    lesson.lessonDate = newDate;
    lesson.lessonTime = newTime;
    lesson.status = this.determineStatus(newDate, newTime, lesson.duration);

    try {
      await lesson.save();

      // Send email notifications
      try {
        const [tutor, student] = await Promise.all([
          TutorModel.findById(lesson.tutorId),
          StudentModel.findById(lesson.studentId)
        ]);

        if (tutor && student) {
          await this.emailService.sendLessonRescheduleEmail({
            tutorEmail: tutor.email,
            tutorName: tutor.fullName,
            studentEmail: student.email,
            studentName: student.studentName,
            oldDate: oldDate,
            oldTime: oldTime,
            newDate: newDate,
            newTime: newTime,
            duration: lesson.duration,
            level: lesson.level,
            topic: lesson.topic,
            type: lesson.type,
            location: lesson.location,
            rescheduledBy: requesterType as "tutor" | "admin",
            dashboardUrl: process.env.FRONTEND_URL!
          });
        }
      } catch (emailError) {
        logger.error(`Failed to send lesson reschedule emails: ${emailError instanceof Error ? emailError.message : "Unknown error"}`);
        // Don't throw error for email failures, just log them
      }

      logger.info(
        `Lesson rescheduled: ${lessonId} to ${newDate.toISOString().split("T")[0]} ${newTime} by ${requesterType} ${requesterId}`
      );
      return lesson;
    } catch (error) {
      logger.error(
        `Failed to reschedule lesson ${lessonId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
      throw new BadRequestError("Failed to reschedule lesson");
    }
  }

  async cancelLesson(
    lessonId: string,
    requesterId: string,
    requesterType: string
  ): Promise<ILesson> {
    if (
      requesterType !== "admin" &&
      requesterType !== "student" &&
      requesterType !== "tutor"
    ) {
      logger.warn(
        `Unauthorized cancel attempt by ${requesterType}: ${requesterId}`
      );
      throw new UnauthorizedError(
        "Only admins, students, or tutors can cancel lessons"
      );
    }

    const lesson = await LessonModel.findById(lessonId);
    if (!lesson) {
      logger.warn(`Lesson not found: ${lessonId}`);
      throw new BadRequestError("Lesson not found");
    }

    if (
      (requesterType === "student" &&
        lesson.studentId.toString() !== requesterId) ||
      (requesterType === "tutor" && lesson.tutorId.toString() !== requesterId)
    ) {
      logger.warn(
        `${requesterType} ${requesterId} not authorized to cancel lesson ${lessonId}`
      );
      throw new UnauthorizedError(
        "You are not authorized to cancel this lesson"
      );
    }

    if (lesson.status === "Cancelled") {
      logger.warn(`Lesson already cancelled: ${lessonId}`);
      throw new BadRequestError("Lesson is already cancelled");
    }

    lesson.status = "Cancelled";
    lesson.cancelledAt = new Date(); // Track when the lesson was cancelled

    // Check if student is cancelling within 24 hours of lesson start time
    if (requesterType === "student") {
      const now = new Date();
      const lessonDateTime = new Date(lesson.lessonDate);
      const [hours, minutes] = lesson.lessonTime.split(":").map(Number);
      lessonDateTime.setHours(hours, minutes, 0, 0);

      const hoursUntilLesson = (lessonDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilLesson < 24) {
        lesson.tutorPaid = true;
        logger.info(
          `Student cancelled lesson ${lessonId} within 24 hours (${hoursUntilLesson.toFixed(1)} hours). Tutor will be paid.`
        );
      }
    }

    try {
      await lesson.save();
      await StudentModel.findByIdAndUpdate(lesson.studentId, {
        $pull: { lessonsAssigned: lesson._id },
      });
      await TutorModel.findByIdAndUpdate(lesson.tutorId, {
        $pull: { delegatedLessons: lesson._id },
      });

      // Send email notifications
      try {
        const [tutor, student] = await Promise.all([
          TutorModel.findById(lesson.tutorId),
          StudentModel.findById(lesson.studentId)
        ]);

        if (tutor && student) {
          await this.emailService.sendLessonCancellationEmail({
            tutorEmail: tutor.email,
            tutorName: tutor.fullName,
            studentEmail: student.email,
            studentName: student.studentName,
            lessonDate: lesson.lessonDate,
            lessonTime: lesson.lessonTime,
            duration: lesson.duration,
            level: lesson.level,
            topic: lesson.topic,
            cancelledBy: requesterType as "tutor" | "student" | "admin",
            tutorPaid: lesson.tutorPaid,
            dashboardUrl: process.env.FRONTEND_URL!
          });
        }
      } catch (emailError) {
        logger.error(`Failed to send lesson cancellation emails: ${emailError instanceof Error ? emailError.message : "Unknown error"}`);
        // Don't throw error for email failures, just log them
      }

      const paymentNote = lesson.tutorPaid ? " (Tutor will be paid due to late cancellation)" : "";
      logger.info(
        `Lesson cancelled: ${lessonId} by ${requesterType} ${requesterId}${paymentNote}`
      );
      return lesson;
    } catch (error) {
      logger.error(
        `Failed to cancel lesson ${lessonId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
      throw new BadRequestError("Failed to cancel lesson");
    }
  }

  async undoLessonCancellation(
    lessonId: string,
    requesterId: string,
    requesterType: string
  ): Promise<ILesson> {
    if (
      requesterType !== "admin" &&
      requesterType !== "student" &&
      requesterType !== "tutor"
    ) {
      logger.warn(
        `Unauthorized undo cancel attempt by ${requesterType}: ${requesterId}`
      );
      throw new UnauthorizedError(
        "Only admins, students, or tutors can undo lesson cancellation"
      );
    }

    const lesson = await LessonModel.findById(lessonId);
    if (!lesson) {
      logger.warn(`Lesson not found: ${lessonId}`);
      throw new BadRequestError("Lesson not found");
    }

    if (lesson.status !== "Cancelled") {
      logger.warn(`Lesson is not cancelled: ${lessonId}`);
      throw new BadRequestError("Lesson is not cancelled");
    }

    if (
      (requesterType === "student" &&
        lesson.studentId.toString() !== requesterId) ||
      (requesterType === "tutor" && lesson.tutorId.toString() !== requesterId)
    ) {
      logger.warn(
        `${requesterType} ${requesterId} not authorized to undo cancel lesson ${lessonId}`
      );
      throw new UnauthorizedError(
        "You are not authorized to undo cancellation for this lesson"
      );
    }

    // Check if it's within 24 hours of the lesson start time
    const now = new Date();
    const lessonDateTime = new Date(lesson.lessonDate);
    const [hours, minutes] = lesson.lessonTime.split(":").map(Number);
    lessonDateTime.setHours(hours, minutes, 0, 0);

    const hoursUntilLesson = (lessonDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilLesson < 0) {
      logger.warn(`Cannot undo cancellation for past lesson: ${lessonId}`);
      throw new BadRequestError("Cannot undo cancellation for a lesson that has already passed");
    }

    if (hoursUntilLesson < 24) {
      logger.warn(`Cannot undo cancellation when less than 24 hours remain before lesson: ${lessonId}`);
      throw new BadRequestError("Cannot undo cancellation when less than 24 hours remain before the lesson");
    }

    // Restore the lesson to scheduled status
    lesson.status = this.determineStatus(lesson.lessonDate, lesson.lessonTime, lesson.duration);
    lesson.cancelledAt = undefined;
    lesson.tutorPaid = false; // Reset tutor paid status

    try {
      await lesson.save();

      // Send email notifications
      try {
        const [tutor, student] = await Promise.all([
          TutorModel.findById(lesson.tutorId),
          StudentModel.findById(lesson.studentId)
        ]);

        if (tutor && student) {
          await this.emailService.sendLessonRescheduleEmail({
            tutorEmail: tutor.email,
            tutorName: tutor.fullName,
            studentEmail: student.email,
            studentName: student.studentName,
            oldDate: lesson.lessonDate,
            oldTime: lesson.lessonTime,
            newDate: lesson.lessonDate,
            newTime: lesson.lessonTime,
            duration: lesson.duration,
            level: lesson.level,
            topic: lesson.topic,
            type: lesson.type,
            location: lesson.location,
            rescheduledBy: requesterType as "tutor" | "admin",
            dashboardUrl: process.env.FRONTEND_URL! 
          });
        }
      } catch (emailError) {
        logger.error(`Failed to send lesson restoration emails: ${emailError instanceof Error ? emailError.message : "Unknown error"}`);
        // Don't throw error for email failures, just log them
      }

      logger.info(
        `Lesson cancellation undone: ${lessonId} by ${requesterType} ${requesterId}`
      );
      return lesson;
    } catch (error) {
      logger.error(
        `Failed to undo lesson cancellation ${lessonId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
      throw new BadRequestError("Failed to undo lesson cancellation");
    }
  }

  async updateLesson(
    lessonId: string,
    updateData: any,
    requesterId: string,
    requesterType: string
  ): Promise<ILesson> {
    if (requesterType !== "admin" && requesterType !== "tutor") {
      logger.warn(
        `Unauthorized update attempt by ${requesterType}: ${requesterId}`
      );
      throw new UnauthorizedError("Only admins or tutors can update lessons");
    }

    const lesson = await LessonModel.findById(lessonId);
    if (!lesson) {
      logger.warn(`Lesson not found: ${lessonId}`);
      throw new BadRequestError("Lesson not found");
    }

    if (
      requesterType === "tutor" &&
      lesson.tutorId.toString() !== requesterId
    ) {
      logger.warn(
        `Tutor ${requesterId} not authorized to update lesson ${lessonId}`
      );
      throw new UnauthorizedError(
        "You are not the assigned tutor for this lesson"
      );
    }

    // Validate participants if they are being changed
    if (updateData.tutorId || updateData.studentId) {
      const tutorId = updateData.tutorId || lesson.tutorId.toString();
      const studentId = updateData.studentId || lesson.studentId.toString();
      await this.validateParticipants(tutorId, studentId);
    }

    // Check tutor availability if date/time/duration is being changed
    if (updateData.lessonDate || updateData.lessonTime || updateData.duration) {
      const tutorId = updateData.tutorId || lesson.tutorId.toString();
      const lessonDate = updateData.lessonDate ? new Date(updateData.lessonDate) : lesson.lessonDate;
      const lessonTime = updateData.lessonTime || lesson.lessonTime;
      const duration = updateData.duration || lesson.duration;

      await this.checkTutorAvailability(tutorId, lessonDate, lessonTime, duration);
    }

    // Update lesson fields
    if (updateData.lessonDate) lesson.lessonDate = new Date(updateData.lessonDate);
    if (updateData.lessonTime) lesson.lessonTime = updateData.lessonTime;
    if (updateData.duration) lesson.duration = updateData.duration;
    if (updateData.level) lesson.level = updateData.level;
    if (updateData.topic) lesson.topic = updateData.topic;
    if (updateData.type) lesson.type = updateData.type;
    if (updateData.location !== undefined) lesson.location = updateData.location;
    if (updateData.tutorId) lesson.tutorId = new Types.ObjectId(updateData.tutorId);
    if (updateData.studentId) lesson.studentId = new Types.ObjectId(updateData.studentId);

    // Update status based on new date/time
    if (updateData.lessonDate || updateData.lessonTime) {
      lesson.status = this.determineStatus(lesson.lessonDate, lesson.lessonTime, lesson.duration);
    }

    try {
      await lesson.save();
      logger.info(
        `Lesson updated: ${lessonId} by ${requesterType} ${requesterId}`
      );
      return lesson;
    } catch (error) {
      logger.error(
        `Failed to update lesson ${lessonId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
      throw new BadRequestError("Failed to update lesson");
    }
  }

  async updateExpiredLessons(): Promise<void> {
    const now = new Date();
    const expiredLessons = await LessonModel.find({
      status: "Incoming",
      $or: [
        {
          lessonDate: { $lt: now },
        },
        {
          $and: [
            { lessonDate: now },
            {
              lessonTime: {
                $lt: now.toTimeString().slice(0, 5),
              },
            },
          ],
        },
      ],
    });

    if (expiredLessons.length > 0) {
      await LessonModel.updateMany(
        { _id: { $in: expiredLessons.map((lesson) => lesson._id) } },
        { status: "Completed" }
      );
      logger.info(`Updated ${expiredLessons.length} expired lessons to completed status`);
    }
  }

  async bulkUpdateLessons(
    lessonIds: string[],
    updateData: any,
    requesterId: string,
    requesterType: string
  ): Promise<ILesson[]> {
    if (requesterType !== "admin") {
      logger.warn(
        `Unauthorized bulk lesson update attempt by ${requesterType}: ${requesterId}`
      );
      throw new UnauthorizedError("Only admins can perform bulk lesson updates");
    }

    if (!lessonIds || lessonIds.length === 0) {
      throw new BadRequestError("At least one lesson ID is required");
    }

    // Validate that all lessons exist
    const existingLessons = await LessonModel.find({
      _id: { $in: lessonIds.map(id => new Types.ObjectId(id)) }
    });

    if (existingLessons.length !== lessonIds.length) {
      throw new BadRequestError("One or more lessons not found");
    }

    // Prepare update data
    const updateFields: any = {};

    if (updateData.duration !== undefined) {
      updateFields.duration = updateData.duration;
    }
    if (updateData.level !== undefined) {
      updateFields.level = updateData.level;
    }
    if (updateData.topic !== undefined) {
      updateFields.topic = updateData.topic;
    }
    if (updateData.type !== undefined) {
      updateFields.type = updateData.type;
      // Clear location if switching to online
      if (updateData.type === "online") {
        updateFields.location = undefined;
      }
    }
    if (updateData.location !== undefined) {
      updateFields.location = updateData.location;
    }
    if (updateData.lessonTime !== undefined) {
      updateFields.lessonTime = updateData.lessonTime;
    }
    if (updateData.lessonDate !== undefined) {
      updateFields.lessonDate = new Date(updateData.lessonDate);
      // Update status based on new date
      updateFields.status = this.determineStatus(
        new Date(updateData.lessonDate),
        updateData.lessonTime || existingLessons[0].lessonTime,
        updateData.duration || existingLessons[0].duration
      );
    }
    if (updateData.tutorId !== undefined) {
      // Validate tutor exists
      const tutor = await TutorModel.findById(updateData.tutorId);
      if (!tutor) {
        throw new BadRequestError("Tutor not found");
      }
      updateFields.tutorId = new Types.ObjectId(updateData.tutorId);
    }
    if (updateData.studentId !== undefined) {
      // Validate student exists
      const student = await StudentModel.findById(updateData.studentId);
      if (!student) {
        throw new BadRequestError("Student not found");
      }
      updateFields.studentId = new Types.ObjectId(updateData.studentId);
    }

    if (Object.keys(updateFields).length === 0) {
      throw new BadRequestError("No valid fields to update");
    }

    // Update lessons
    const result = await LessonModel.updateMany(
      { _id: { $in: lessonIds.map(id => new Types.ObjectId(id)) } },
      { $set: updateFields }
    );

    if (result.modifiedCount === 0) {
      throw new BadRequestError("No lessons were updated");
    }

    // Fetch updated lessons
    const updatedLessons = await LessonModel.find({
      _id: { $in: lessonIds.map(id => new Types.ObjectId(id)) }
    });

    logger.info(
      `Bulk updated ${result.modifiedCount} lessons by admin ${requesterId}`
    );

    return updatedLessons;
  }

  async completeLesson(
    lessonId: string,
    requesterId: string,
    requesterType: string
  ): Promise<ILesson> {
    const lesson = await LessonModel.findById(lessonId);
    if (!lesson) {
      logger.warn(`Lesson not found: ${lessonId}`);
      throw new BadRequestError("Lesson not found");
    }

    if (requesterType !== "admin" && requesterId !== lesson.tutorId.toString()) {
      logger.warn(
        `Unauthorized lesson completion attempt by ${requesterType}: ${requesterId}`
      );
      throw new UnauthorizedError(
        "Only the assigned tutor or an admin can complete a lesson"
      );
    }

    lesson.status = "Completed";
    await lesson.save();

    // Send email notifications
    try {
      const [tutor, student] = await Promise.all([
        TutorModel.findById(lesson.tutorId),
        StudentModel.findById(lesson.studentId)
      ]);

      if (tutor && student) {
        await this.emailService.sendLessonCompletionEmail({
          tutorEmail: tutor.email,
          tutorName: tutor.fullName,
          studentEmail: student.email,
          studentName: student.studentName,
          lessonDate: lesson.lessonDate,
          lessonTime: lesson.lessonTime,
          duration: lesson.duration,
          level: lesson.level,
          topic: lesson.topic,
          dashboardUrl: process.env.FRONTEND_URL!
        });
      }
    } catch (emailError) {
      logger.error(`Failed to send lesson completion emails: ${emailError instanceof Error ? emailError.message : "Unknown error"}`);
      // Don't throw error for email failures, just log them
    }

    logger.info(
      `Lesson ${lessonId} completed by ${requesterType}: ${requesterId}`
    );
    return lesson;
  }

  private mapStatus(dbStatus: string): "scheduled" | "completed" | "cancelled" {
    if (dbStatus === "Cancelled") return "cancelled";
    if (dbStatus === "Completed") return "completed";
    return "scheduled";
  }
}

