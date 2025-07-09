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

interface LessonResponse {
  lessonId: Types.ObjectId;
  lessonDate: Date;
  lessonTime: string;
  duration: number;
  subject: string;
  topic: string;
  type: "online" | "in-person";
  location?: string;
  tutorName?: string;
  studentName?: string;
  status: string;
  bundleId?: Types.ObjectId | null;
  tutorPaid?: boolean;
}

// Type for populated lesson document after lean()
interface PopulatedLesson {
  lessonId: Types.ObjectId;
  lessonDate: Date;
  lessonTime: string;
  duration: number;
  status: string;
  subject: string;
  topic: string;
  type: "online" | "in-person";
  location?: string;
  tutorId: { fullName: string };
  studentId: { studentName: string };
  bundleId?: Types.ObjectId | null;
  tutorPaid: boolean;
  _id: Types.ObjectId;
  __v?: number;
}

export class LessonService {
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
      subject: dto.subject,
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
        subject: dto.subject,
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
        .lean()) as unknown as PopulatedLesson[];

      return lessons.map((lesson) => ({
        lessonId: lesson._id,
        lessonDate: lesson.lessonDate,
        lessonTime: lesson.lessonTime,
        duration: lesson.duration,
        subject: lesson.subject,
        topic: lesson.topic,
        type: lesson.type,
        location: lesson.location,
        tutorName: lesson.tutorId?.fullName,
        studentName: lesson.studentId?.studentName,
        status: this.mapStatus(lesson.status),
        bundleId: lesson.bundleId,
        tutorPaid: lesson.tutorPaid,
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

    const newDate = dto.newDate ? new Date(dto.newDate) : lesson.lessonDate;
    const newTime = dto.newTime || lesson.lessonTime;

    lesson.lessonDate = newDate;
    lesson.lessonTime = newTime;
    lesson.status = this.determineStatus(newDate, newTime, lesson.duration);

    try {
      await lesson.save();
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
    if (updateData.subject) lesson.subject = updateData.subject;
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
    try {
      const now = new Date();

      // Find all Active lessons that should be completed
      const activeLessons = await LessonModel.find({
        status: "Active"
      });

      const lessonsToComplete = activeLessons.filter(lesson => {
        const lessonDateTime = new Date(lesson.lessonDate);
        const [hours, minutes] = lesson.lessonTime.split(":").map(Number);
        lessonDateTime.setHours(hours, minutes, 0, 0);

        const lessonEndTime = new Date(lessonDateTime.getTime() + lesson.duration * 60 * 1000);
        return now >= lessonEndTime;
      });

      if (lessonsToComplete.length > 0) {
        const lessonIds = lessonsToComplete.map(lesson => lesson._id);

        await LessonModel.updateMany(
          { _id: { $in: lessonIds } },
          { $set: { status: "Completed" } }
        );

        logger.info(
          `Auto-completed ${lessonsToComplete.length} lessons: ${lessonIds.join(", ")}`
        );
      }

      // Also update Incoming lessons that should now be Active
      const incomingLessons = await LessonModel.find({
        status: "Incoming"
      });

      const lessonsToActivate = incomingLessons.filter(lesson => {
        const lessonDateTime = new Date(lesson.lessonDate);
        const [hours, minutes] = lesson.lessonTime.split(":").map(Number);
        lessonDateTime.setHours(hours, minutes, 0, 0);

        const lessonEndTime = new Date(lessonDateTime.getTime() + lesson.duration * 60 * 1000);
        return now >= lessonDateTime && now < lessonEndTime;
      });

      if (lessonsToActivate.length > 0) {
        const activateIds = lessonsToActivate.map(lesson => lesson._id);

        await LessonModel.updateMany(
          { _id: { $in: activateIds } },
          { $set: { status: "Active" } }
        );

        logger.info(
          `Auto-activated ${lessonsToActivate.length} lessons: ${activateIds.join(", ")}`
        );
      }

    } catch (error) {
      logger.error(
        `Failed to update expired lessons: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
    }
  }

  async completeLesson(
    lessonId: string,
    requesterId: string,
    requesterType: string
  ): Promise<ILesson> {
    if (requesterType !== "admin" && requesterType !== "tutor") {
      logger.warn(
        `Unauthorized complete attempt by ${requesterType}: ${requesterId}`
      );
      throw new UnauthorizedError(
        "Only admins or tutors can mark lessons as completed"
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
        `Tutor ${requesterId} not authorized to complete lesson ${lessonId}`
      );
      throw new UnauthorizedError(
        "You are not the assigned tutor for this lesson"
      );
    }

    if (lesson.status === "Completed") {
      logger.warn(`Lesson already completed: ${lessonId}`);
      throw new BadRequestError("Lesson is already completed");
    }

    if (lesson.status === "Cancelled") {
      logger.warn(`Cannot complete cancelled lesson: ${lessonId}`);
      throw new BadRequestError("Cannot complete a cancelled lesson");
    }

    lesson.status = "Completed";

    try {
      await lesson.save();
      logger.info(
        `Lesson completed: ${lessonId} by ${requesterType} ${requesterId}`
      );
      return lesson;
    } catch (error) {
      logger.error(
        `Failed to complete lesson ${lessonId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error
      );
      throw new BadRequestError("Failed to complete lesson");
    }
  }

  private mapStatus(dbStatus: string): "scheduled" | "completed" | "cancelled" {
    if (dbStatus === "Cancelled") return "cancelled";
    if (dbStatus === "Completed") return "completed";
    return "scheduled"; // Incoming/Active
  }
}
