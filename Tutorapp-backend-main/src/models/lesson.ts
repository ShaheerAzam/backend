import { Schema, model, Document, Types } from "mongoose";

export interface ILesson extends Document {
  _id: Types.ObjectId;
  lessonDate: Date;
  lessonTime: string;
  duration: number;
  level: "1st grade" | "2nd grade" | "3rd grade" | "4th grade" | "5th grade" | "6th grade" | "7th grade" | "8th grade" | "9th grade" | "10th grade" | "1T" | "1P" | "2P" | "S1" | "R1" | "S2" | "R2";
  topic: string;
  type: "online" | "in-person";
  location?: string;
  tutorId: Types.ObjectId;
  studentId: Types.ObjectId;
  status: "Incoming" | "Active" | "Completed" | "Cancelled";
  bundleId?: Types.ObjectId | null;
  tutorPaid: boolean;
  cancelledAt?: Date; // When the lesson was cancelled
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new Schema<ILesson>(
  {
    lessonDate: { type: Date, required: true },
    lessonTime: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 1 },
    level: {
      type: String,
      required: true,
      enum: ["1st grade", "2nd grade", "3rd grade", "4th grade", "5th grade", "6th grade", "7th grade", "8th grade", "9th grade", "10th grade", "1T", "1P", "2P", "S1", "R1", "S2", "R2"],
      trim: true
    },
    topic: { type: String, required: true, trim: true },
    type: { type: String, enum: ["online", "in-person"], default: "online" },
    location: { type: String, default: undefined, trim: true },
    tutorId: { type: Schema.Types.ObjectId, ref: "Tutor", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    status: {
      type: String,
      enum: ["Incoming", "Active", "Completed", "Cancelled"],
      default: "Incoming",
    },
    bundleId: { type: Schema.Types.ObjectId, default: null },
    tutorPaid: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null }, // When the lesson was cancelled
  },
  { timestamps: true }
);

export const LessonModel = model<ILesson>("Lesson", lessonSchema);
