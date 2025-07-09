import { Request, Response, NextFunction } from "express";
import { AdminService } from "../services/adminService";
import { ChangeAdminPasswordDto } from "../dtos/adminDto";
import { logger } from "../utils/logger";
import { StudentModel } from "../models/student";
import { TutorModel } from "../models/tutor";
import { LessonModel } from "../models/lesson";
import { startOfWeek, endOfWeek } from "date-fns";

const adminService = new AdminService();

export async function changeAdminPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const dto: ChangeAdminPasswordDto = req.body;
    await adminService.changePassword(dto);
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    logger.error(
      `Change admin password error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error); // Pass error to middleware
  }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const studentCount = await StudentModel.countDocuments();
    const tutorCount = await TutorModel.countDocuments();
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const lessonsThisWeek = await LessonModel.countDocuments({
      lessonDate: { $gte: weekStart, $lte: weekEnd },
      status: { $ne: "Cancelled" },
    });
    // Simplified revenue: completed lessons * tutor hourlyRate * hours
    const completedLessons = await LessonModel.aggregate([
      { $match: { status: "Completed" } },
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
        $addFields: {
          amount: {
            $multiply: [
              { $divide: ["$duration", 60] },
              "$tutor.hourlyRate",
            ],
          },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$amount" } } },
    ]);
    const revenue = completedLessons[0]?.revenue || 0;
    res.status(200).json({
      message: "Stats fetched",
      data: { studentCount, tutorCount, lessonsThisWeek, revenue },
    });
  } catch (error) {
    logger.error(`Get stats error: ${error instanceof Error ? error.message : "Unknown"}`, error);
    next(error);
  }
}

export async function listStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const students = await StudentModel.find().select("studentName email phoneNumber createdAt");
    res.status(200).json({ message: "Students fetched", data: students });
  } catch (error) {
    logger.error(`List students error: ${error instanceof Error ? error.message : "Unknown"}`, error);
    next(error);
  }
}

export async function listTutors(req: Request, res: Response, next: NextFunction) {
  try {
    const tutors = await TutorModel.find().select("fullName email phoneNumber hourlyRate createdAt");
    res.status(200).json({ message: "Tutors fetched", data: tutors });
  } catch (error) {
    logger.error(`List tutors error: ${error instanceof Error ? error.message : "Unknown"}`, error);
    next(error);
  }
}
