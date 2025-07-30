import mongoose, { Document, Schema } from "mongoose";

export interface IEarningsConfig extends Document {
    inPersonBonus: number;
    invoiceMarkup: number;
    createdAt: Date;
    updatedAt: Date;
}

const earningsConfigSchema = new Schema<IEarningsConfig>(
    {
        inPersonBonus: {
            type: Number,
            required: true,
            default: 5,
            min: 0,
        },
        invoiceMarkup: {
            type: Number,
            required: true,
            default: 15,
            min: 0,
            max: 100,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure only one configuration document exists
earningsConfigSchema.index({}, { unique: true });

export const EarningsConfigModel = mongoose.model<IEarningsConfig>(
    "EarningsConfig",
    earningsConfigSchema
); 