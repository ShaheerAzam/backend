import { Schema, model, Document, Types } from "mongoose";

export interface IEarningsApproval extends Document {
    _id: Types.ObjectId;
    tutorId: Types.ObjectId;
    periodStart: Date;
    periodEnd: Date;
    totalHours: number;
    totalAmount: number;
    status: "pending" | "approved" | "rejected";
    approvedBy?: Types.ObjectId; // Admin who approved
    approvedAt?: Date;
    lessonIds: Types.ObjectId[]; // Lessons included in this approval
    createdAt: Date;
    updatedAt: Date;
}

const earningsApprovalSchema = new Schema<IEarningsApproval>(
    {
        tutorId: { type: Schema.Types.ObjectId, ref: "Tutor", required: true },
        periodStart: { type: Date, required: true },
        periodEnd: { type: Date, required: true },
        totalHours: { type: Number, required: true, min: 0 },
        totalAmount: { type: Number, required: true, min: 0 },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        approvedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
        approvedAt: { type: Date, default: null },
        lessonIds: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
    },
    { timestamps: true }
);

// Compound index to ensure unique periods per tutor
earningsApprovalSchema.index({ tutorId: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

export const EarningsApprovalModel = model<IEarningsApproval>("EarningsApproval", earningsApprovalSchema); 