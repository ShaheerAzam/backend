import { Schema, model, Document, Types } from "mongoose";

export interface IStudent extends Document {
  _id: Types.ObjectId;
  studentName: string;
  email: string;
  phoneNumber: string;
  password: string;
  refreshToken?: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    password: { type: String, required: true },
    refreshToken: { type: String, default: null },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
);

export const StudentModel = model<IStudent>("Student", studentSchema);
