import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDailyMessage extends Document {
  adminId: Types.ObjectId;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const dailyMessageSchema: Schema<IDailyMessage> = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDailyMessage>("DailyMessage", dailyMessageSchema);
