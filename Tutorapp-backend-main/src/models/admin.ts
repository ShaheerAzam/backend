import { Schema, model, Document, Types } from "mongoose";

export interface IAdmin extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    refreshToken: { type: String, default: null },
  },
  { timestamps: true }
);

export const AdminModel = model<IAdmin>("Admin", adminSchema);
