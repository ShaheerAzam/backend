// src/tests/rescheduleLesson.test.ts
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { LessonService } from "../services/lessonService";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

describe("LessonService - rescheduleLesson", () => {
  const existingLessonId = "686b2856b1976807a0e146b0";
  const tutorId = "686b2856b1976807a0e146a7";
  const studentId = "686b2856b1976807a0e146a3";
  const validToken = jwt.sign(
    { userId: tutorId, userType: "tutor" },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "1h" }
  );

  const newDate = "2025-07-20";
  const newTime = "18:00";

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI!);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("should reschedule a lesson when requested by the assigned tutor", async () => {
    const lessonService = new LessonService();

    const updatedLesson = await lessonService.rescheduleLesson(
      existingLessonId,
      { newDate, newTime },
      tutorId,
      "tutor"
    );

    console.log("\n🔁 Updated Lesson:\n", updatedLesson);

    expect(updatedLesson._id.toString()).toBe(existingLessonId);
    expect(updatedLesson.lessonDate.toISOString().split("T")[0]).toBe(newDate);
    expect(updatedLesson.lessonTime).toBe(newTime);
  });
});
