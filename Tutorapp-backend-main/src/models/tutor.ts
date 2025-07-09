import { Schema, model, Document, Types } from "mongoose";

export interface ITutor extends Document {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  hourlyRate: number;
  assignedLessons: Types.ObjectId[];
  refreshToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const tutorSchema = new Schema<ITutor>(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    hourlyRate: { type: Number, required: true, min: 0 },
    assignedLessons: [
      { type: Schema.Types.ObjectId, ref: "Lesson", default: [] },
    ],
    refreshToken: { type: String, default: null },
  },
  { timestamps: true }
);

export const TutorModel = model<ITutor>("Tutor", tutorSchema);
