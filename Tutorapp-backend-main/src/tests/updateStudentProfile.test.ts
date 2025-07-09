import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { StudentService } from "../../src/services/studentService";
import dotenv from "dotenv";

dotenv.config();

describe("StudentService - updateStudentProfile", () => {
  const existingStudentId = "686b22638f6cfa3f4b4c68e6";

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

  it("should update the student profile with valid data", async () => {
    const studentService = new StudentService();

    const updateDto = {
      studentName: "Updated Student Name",
      phoneNumber: "0987654321",
      password: "newpassword123",
    };

    const updatedStudent = await studentService.updateStudentProfile(
      existingStudentId,
      updateDto,
      existingStudentId,
      "student"
    );

    console.log("✅ Updated Student:\n", {
      id: updatedStudent._id,
      name: updatedStudent.studentName,
      phone: updatedStudent.phoneNumber,
    });

    expect(updatedStudent).toHaveProperty(
      "_id",
      new mongoose.Types.ObjectId(existingStudentId)
    );
    expect(updatedStudent.studentName).toBe(updateDto.studentName);
    expect(updatedStudent.phoneNumber).toBe(updateDto.phoneNumber);
  });

  it("should throw an error if a different student tries to update", async () => {
    const studentService = new StudentService();

    const updateDto = {
      studentName: "Malicious Update",
    };

    await expect(
      studentService.updateStudentProfile(
        existingStudentId,
        updateDto,
        "someOtherStudentId",
        "student"
      )
    ).rejects.toThrow("You can only update your own profile");
  });
});
