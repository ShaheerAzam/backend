import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app"; // Adjust path to your app entry file
import dotenv from "dotenv";

dotenv.config();

describe("PATCH /api/tutors/profile", () => {
  const existingTutorId = "686b22638f6cfa3f4b4c68eb";

  const tutorToken = jwt.sign(
    { userId: existingTutorId, userType: "tutor" },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "1h" }
  );

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI!);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("should update the tutor profile with valid data", async () => {
    const res = await request(app)
      .patch("/api/tutors/profile") // Update to correct route if different
      .set("Authorization", `Bearer ${tutorToken}`)
      .send({
        fullName: "Updated Tutor Name",
        phoneNumber: "9876543210",
        password: "newPassword123",
      });

    console.log("\n✅ Updated Tutor Response:\n", res.body);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data.fullName).toBe("Updated Tutor Name");
    expect(res.body.data.phoneNumber).toBe("9876543210");
  });

  it("should reject if a non-tutor tries to update", async () => {
    const fakeToken = jwt.sign(
      { userId: existingTutorId, userType: "student" },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .patch("/api/tutors/profile")
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({
        fullName: "Hacker Name",
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/only update your own profile/i);
  });
});
