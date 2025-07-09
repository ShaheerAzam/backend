import { Request, Response, NextFunction } from "express";
import { StudentService } from "../services/studentService";
import { CreateStudentDto, UpdateStudentProfileDto } from "../dtos/studentDto";
import { logger } from "../utils/logger";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

const studentService = new StudentService();

export async function registerStudent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const dto: CreateStudentDto = req.body;
    const student = await studentService.createStudent(dto);
    res.status(201).json({
      message: "Student registered successfully",
      data: {
        id: student._id,
        studentName: student.studentName,
        email: student.email,
        phoneNumber: student.phoneNumber,
      },
    });
  } catch (error) {
    logger.error(
      `Register student error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error); // Pass error to middleware
  }
}

export async function updateStudentProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const dto: UpdateStudentProfileDto = req.body;
    const student = await studentService.updateStudentProfile(
      req.user!.userId,
      dto,
      req.user!.userId,
      req.user!.userType
    );
    res.status(200).json({
      message: "Student profile updated successfully",
      data: {
        id: student._id,
        studentName: student.studentName,
        email: student.email,
        phoneNumber: student.phoneNumber,
      },
    });
  } catch (error) {
    logger.error(
      `Update student profile error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}

export async function updateStudent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const student = await studentService.updateStudent(id, updateData);

    res.status(200).json({
      message: "Student updated successfully",
      data: {
        id: student._id,
        studentName: student.studentName,
        email: student.email,
        phoneNumber: student.phoneNumber,
      },
    });
  } catch (error) {
    logger.error(
      `Update student error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}

export async function deleteStudent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;

    await studentService.deleteStudent(id);

    res.status(200).json({
      message: "Student deleted successfully",
    });
  } catch (error) {
    logger.error(
      `Delete student error: ${error instanceof Error ? error.message : "Unknown error"}`,
      error
    );
    next(error);
  }
}
