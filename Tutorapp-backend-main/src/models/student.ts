import { Schema, model, Document, Types } from "mongoose";

export interface IStudent extends Document {
  _id: Types.ObjectId;
  studentName: string;
  email: string;
  phoneNumber: string;
  password: string;
  lessonsAssigned: Types.ObjectId[];
  refreshToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    studentName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    lessonsAssigned: [
      { type: Schema.Types.ObjectId, ref: "Lesson", default: [] },
    ],
    refreshToken: { type: String, default: null },
  },
  { timestamps: true }
);

export const StudentModel = model<IStudent>("Student", studentSchema);
