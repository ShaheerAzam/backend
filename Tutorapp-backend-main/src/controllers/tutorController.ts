import { Request, Response, NextFunction } from "express";
import { TutorService } from "../services/tutorService";
import { CreateTutorDto } from "../dtos/tutorDto";
import { logger } from "../utils/logger";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { UpdateTutorProfileDto } from "../dtos/lessonDto";
import { LessonModel } from "../models/lesson";

const tutorService = new TutorService();

export async function registerTutor(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const dto: CreateTutorDto = req.body;
    const tutor = await tutorService.createTutor(dto);
    res.status(201).json({
      message: "Tutor registered successfully",
      data: {
        id: tutor._id,
        fullName: tutor.fullName,
        email: tutor.email,
        phoneNumber: tutor.phoneNumber,
        hourlyRate: tutor.hourlyRate,
      },
    });
  } catch (error) {
    logger.error(
      `Register tutor error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error); // Pass error to middleware
  }
}

export async function updateTutorProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const dto: UpdateTutorProfileDto = req.body;
    const tutor = await tutorService.updateTutorProfile(
      req.user!.userId,
      dto,
      req.user!.userId,
      req.user!.userType
    );
    res.status(200).json({
      message: "Tutor profile updated successfully",
      data: {
        id: tutor._id,
        fullName: tutor.fullName,
        email: tutor.email,
        phoneNumber: tutor.phoneNumber,
        hourlyRate: tutor.hourlyRate,
      },
    });
  } catch (error) {
    logger.error(
      `Update tutor profile error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}

export async function getTutorEarnings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const tutorId = req.user!.userId;
    const lessons = await LessonModel.aggregate([
      { $match: { tutorId: new (require("mongoose").Types.ObjectId)(tutorId), status: "Completed" } },
      {
        $lookup: {
          from: "tutors",
          localField: "tutorId",
          foreignField: "_id",
          as: "tutor",
        },
      },
      { $unwind: "$tutor" },
      {
        $project: {
          date: { $dateToString: { format: "%m/%d/%Y", date: "$lessonDate" } },
          student: "$studentId",
          duration: "$duration",
          rate: "$tutor.hourlyRate",
          amount: { $multiply: [{ $divide: ["$duration", 60] }, "$tutor.hourlyRate"] },
        },
      },
    ]);
    res.status(200).json({ message: "Earnings fetched", data: lessons });
  } catch (error) {
    logger.error(`Get tutor earnings error: ${error instanceof Error ? error.message : "Unknown"}`, error);
    next(error);
  }
}

export async function updateTutor(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const tutor = await tutorService.updateTutor(id, updateData);

    res.status(200).json({
      message: "Tutor updated successfully",
      data: {
        id: tutor._id,
        fullName: tutor.fullName,
        email: tutor.email,
        phoneNumber: tutor.phoneNumber,
        hourlyRate: tutor.hourlyRate,
      },
    });
  } catch (error) {
    logger.error(
      `Update tutor error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}

export async function deleteTutor(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;

    await tutorService.deleteTutor(id);

    res.status(200).json({
      message: "Tutor deleted successfully",
    });
  } catch (error) {
    logger.error(
      `Delete tutor error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}
