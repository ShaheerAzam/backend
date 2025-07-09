import request from "supertest";
import mongoose from "mongoose";
import app from "../../src/app"; // make sure path is correct
import { StudentModel } from "../../src/models/student";
import { TutorModel } from "../../src/models/tutor";
import jwt from "jsonwebtoken";

describe("Lesson API", () => {
  let studentId: string;
  let tutorId: string;
  let studentToken: string;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI!);

    const student = await StudentModel.create({
      studentName: "Test Student",
      email: "test@student.com",
      phoneNumber: "1234567890",
      password: "hashedpassword",
    });

    const tutor = await TutorModel.create({
      fullName: "Test Tutor",
      email: "test@tutor.com",
      phoneNumber: "1234567890",
      password: "hashedpassword",
      hourlyRate: 40,
    });

    studentId = student._id.toString();
    tutorId = tutor._id.toString();

    studentToken = jwt.sign(
      { userId: studentId, userType: "admin" },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "1h" }
    );
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("should create a lesson", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day in future

    const res = await request(app)
      .post("/api/lessons")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        lessonDate: futureDate,
        lessonTime: "10:00",
        duration: 60,
        tutorId,
        studentId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
  });
});
