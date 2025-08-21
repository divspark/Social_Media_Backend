import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  icon: string; // can be emoji or icon URL
}

const categorySchema: Schema<ICategory> = new Schema(
  {
    name: { type: String, required: true },
    icon: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICategory>("Category", categorySchema);
