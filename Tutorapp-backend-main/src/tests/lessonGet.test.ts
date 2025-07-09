import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app"; // Make sure this is a named export or adjust accordingly
import { LessonService } from "../../src/services/lessonService";

describe("GET /api/lessons (getLessons service)", () => {
  const existingStudentId = "686b2856b1976807a0e146a3";
  const studentToken = jwt.sign(
    { userId: existingStudentId, userType: "student" },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "1h" }
  );

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI!);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("should fetch lessons for an existing student and log the response", async () => {
    const lessonService = new LessonService();

    const lessons = await lessonService.getLessons(
      existingStudentId,
      "student"
    );

    console.log("\n📚 Returned Lesson:\n", JSON.stringify(lessons, null, 2));

    expect(Array.isArray(lessons)).toBe(true);
    if (lessons.length > 0) {
      expect(lessons[0]).toHaveProperty("lessonId");
      expect(lessons[0]).toHaveProperty("lessonDate");
      expect(lessons[0]).toHaveProperty("lessonTime");
      expect(lessons[0]).toHaveProperty("duration");
      expect(lessons[0]).toHaveProperty("tutorName");
      expect(lessons[0]).toHaveProperty("status");
    }
  });
});
