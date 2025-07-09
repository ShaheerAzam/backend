import { Schema, model, Document, Types } from "mongoose";

export interface ILesson extends Document {
  _id: Types.ObjectId;
  lessonDate: Date;
  lessonTime: string;
  duration: number;
  subject: string;
  topic: string;
  type: "online" | "in-person";
  location?: string;
  tutorId: Types.ObjectId;
  studentId: Types.ObjectId;
  status: "Incoming" | "Active" | "Completed" | "Cancelled";
  bundleId?: Types.ObjectId | null;
  tutorPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new Schema<ILesson>(
  {
    lessonDate: { type: Date, required: true },
    lessonTime: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 1 },
    subject: { type: String, required: true, trim: true },
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
  },
  { timestamps: true }
);

export const LessonModel = model<ILesson>("Lesson", lessonSchema);
