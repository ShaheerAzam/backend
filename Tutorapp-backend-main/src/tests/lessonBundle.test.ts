import request from "supertest";
import mongoose from "mongoose";
import app from "../../src/app";
import { StudentModel } from "../../src/models/student";
import { TutorModel } from "../../src/models/tutor";
import jwt from "jsonwebtoken";

describe("POST /api/lessons/bundle", () => {
  let studentId: string;
  let tutorId: string;
  let studentToken: string;
  let futureDate: string;

  beforeAll(async () => {
    // Connect to test DB
    await mongoose.connect(process.env.MONGO_URI!);

    // Create test student
    const student = await StudentModel.create({
      studentName: "Bundle Student",
      email: "bundlestudent@example.com",
      phoneNumber: "1234567890",
      password: "hashedpassword",
    });

    // Create test tutor
    const tutor = await TutorModel.create({
      fullName: "Bundle Tutor",
      email: "bundletutor@example.com",
      phoneNumber: "1234567890",
      password: "hashedpassword",
      hourlyRate: 50,
    });

    studentId = student._id.toString();
    tutorId = tutor._id.toString();

    // Generate student access token
    studentToken = jwt.sign(
      { userId: studentId, userType: "admin" },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "1h" }
    );

    // Set a future start date (1 day from now)
    futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("should create a lesson bundle when requested by student with valid data", async () => {
    const res = await request(app)
      .post("/api/lessons/bundle") // Adjust if your route is different
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        lessonTime: "15:00",
        duration: 60,
        numberOfLessons: 3,
        firstLessonDate: futureDate,
        studentId,
        tutorId,
      });

    expect(res.status).toBe(201);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(3);
    expect(res.body.data[0]).toHaveProperty("bundleId");
  });

  it("should reject if unauthorized user tries to create bundle", async () => {
    const fakeToken = jwt.sign(
      { userId: "someOtherId", userType: "tutor" },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .post("/api/lessons/bundle")
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({
        lessonTime: "15:00",
        duration: 60,
        numberOfLessons: 2,
        firstLessonDate: futureDate,
        studentId,
        tutorId,
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Only the student or an admin/i);
  });
});
