import { Request, Response, NextFunction } from "express";
import { LessonService } from "../services/lessonService";
import {
  CreateLessonDto,
  CreateLessonBundleDto,
  RescheduleLessonDto,
} from "../dtos/lessonDto";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { logger } from "../utils/logger";

const lessonService = new LessonService();

const mapStatus = (s: string) => {
  if (s === "Cancelled") return "cancelled";
  if (s === "Completed") return "completed";
  return "scheduled";
};

export async function createLesson(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const dto: CreateLessonDto = req.body;
    const lesson = await lessonService.createLesson(
      dto,
      req.user!.userId,
      req.user!.userType
    );
    res.status(201).json({
      message: "Lesson scheduled successfully",
      data: {
        id: lesson._id,
        lessonDate: lesson.lessonDate,
        lessonTime: lesson.lessonTime,
        duration: lesson.duration,
        tutorId: lesson.tutorId,
        studentId: lesson.studentId,
        status: mapStatus(lesson.status),
      },
    });
  } catch (error) {
    logger.error(
      `Create lesson error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}

export async function createLessonBundle(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const dto: CreateLessonBundleDto = req.body;
    const lessons = await lessonService.createLessonBundle(
      dto,
      req.user!.userId,
      req.user!.userType
    );
    res.status(201).json({
      message: "Lesson bundle scheduled successfully",
      data: lessons.map((lesson) => ({
        id: lesson._id,
        lessonDate: lesson.lessonDate,
        lessonTime: lesson.lessonTime,
        duration: lesson.duration,
        tutorId: lesson.tutorId,
        studentId: lesson.studentId,
        status: mapStatus(lesson.status),
        bundleId: lesson.bundleId,
      })),
    });
  } catch (error) {
    logger.error(
      `Create lesson bundle error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}

export async function getLessons(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const lessons = await lessonService.getLessons(
      req.user!.userId,
      req.user!.userType
    );
    res.status(200).json({
      message: "Lessons retrieved successfully",
      data: lessons,
    });
  } catch (error) {
    logger.error(
      `Get lessons error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}

export async function rescheduleLesson(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const lessonId = req.params.lessonId;
    const dto: RescheduleLessonDto = req.body;
    const lesson = await lessonService.rescheduleLesson(
      lessonId,
      dto,
      req.user!.userId,
      req.user!.userType
    );
    res.status(200).json({
      message: "Lesson rescheduled successfully",
      data: {
        id: lesson._id,
        lessonDate: lesson.lessonDate,
        lessonTime: lesson.lessonTime,
        duration: lesson.duration,
        tutorId: lesson.tutorId,
        studentId: lesson.studentId,
        status: mapStatus(lesson.status),
      },
    });
  } catch (error) {
    logger.error(
      `Reschedule lesson error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}

export async function cancelLesson(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const lessonId = req.params.lessonId;
    const lesson = await lessonService.cancelLesson(
      lessonId,
      req.user!.userId,
      req.user!.userType
    );
    res.status(200).json({
      message: "Lesson cancelled successfully",
      data: {
        id: lesson._id,
        lessonDate: lesson.lessonDate,
        lessonTime: lesson.lessonTime,
        duration: lesson.duration,
        tutorId: lesson.tutorId,
        studentId: lesson.studentId,
        status: mapStatus(lesson.status),
      },
    });
  } catch (error) {
    logger.error(
      `Cancel lesson error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}

export async function undoLessonCancellation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const lessonId = req.params.lessonId;
    const lesson = await lessonService.undoLessonCancellation(
      lessonId,
      req.user!.userId,
      req.user!.userType
    );
    res.status(200).json({
      message: "Lesson cancellation undone successfully",
      data: {
        id: lesson._id,
        lessonDate: lesson.lessonDate,
        lessonTime: lesson.lessonTime,
        duration: lesson.duration,
        tutorId: lesson.tutorId,
        studentId: lesson.studentId,
        status: mapStatus(lesson.status),
      },
    });
  } catch (error) {
    logger.error(
      `Undo lesson cancellation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}

export async function updateLesson(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const lessonId = req.params.lessonId;
    const updateData = req.body;
    const lesson = await lessonService.updateLesson(
      lessonId,
      updateData,
      req.user!.userId,
      req.user!.userType
    );
    res.status(200).json({
      message: "Lesson updated successfully",
      data: {
        id: lesson._id,
        lessonDate: lesson.lessonDate,
        lessonTime: lesson.lessonTime,
        duration: lesson.duration,
        tutorId: lesson.tutorId,
        studentId: lesson.studentId,
        status: mapStatus(lesson.status),
        level: lesson.level,
        topic: lesson.topic,
        type: lesson.type,
        location: lesson.location,
      },
    });
  } catch (error) {
    logger.error(
      `Update lesson error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}

export async function completeLesson(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const lessonId = req.params.lessonId;
    const lesson = await lessonService.completeLesson(
      lessonId,
      req.user!.userId,
      req.user!.userType
    );
    res.status(200).json({
      message: "Lesson completed successfully",
      data: {
        id: lesson._id,
        lessonDate: lesson.lessonDate,
        lessonTime: lesson.lessonTime,
        duration: lesson.duration,
        tutorId: lesson.tutorId,
        studentId: lesson.studentId,
        status: mapStatus(lesson.status),
      },
    });
  } catch (error) {
    logger.error(
      `Complete lesson error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}

export async function updateExpiredLessons(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Only allow admins to trigger this manually
    if (req.user!.userType !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    await lessonService.updateExpiredLessons();
    res.status(200).json({
      message: "Expired lessons updated successfully",
    });
  } catch (error) {
    logger.error(
      `Update expired lessons error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}

export async function bulkUpdateLessons(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { lessonIds, updateData } = req.body;
    const updatedLessons = await lessonService.bulkUpdateLessons(
      lessonIds,
      updateData,
      req.user!.userId,
      req.user!.userType
    );
    res.status(200).json({
      message: `Successfully updated ${updatedLessons.length} lessons`,
      data: updatedLessons.map((lesson) => ({
        id: lesson._id,
        lessonDate: lesson.lessonDate,
        lessonTime: lesson.lessonTime,
        duration: lesson.duration,
        level: lesson.level,
        topic: lesson.topic,
        type: lesson.type,
        location: lesson.location,
        tutorId: lesson.tutorId,
        studentId: lesson.studentId,
        status: mapStatus(lesson.status),
        bundleId: lesson.bundleId,
      })),
    });
  } catch (error) {
    logger.error(
      `Bulk update lessons error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}
