import mongoose, { Document, Schema, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  phone: string;
  role: "user" | "admin" | "pending";
  address?: string;
  fcmToken?: string;

  // Blocking
  isBlocked?: boolean;
  blockedUntil?: Date | null;
  blockReason?: string;

   // Feature Restrictions (Dynamic key-value)
  restrictions?: Map<string, boolean>;
}

const userSchema = new Schema<IUser>(
  {
    uid: String,
    name: String,
    email: String,
    photoURL: String,
    phone: String,
    address: { type: String },
    role: { type: String, enum: ["user", "admin", "pending"], default: "user" },
    fcmToken: { type: String },

    // Blocking Fields
    isBlocked: { type: Boolean, default: false },
    blockedUntil: { type: Date, default: null },
    blockReason: { type: String, default: "" },

    // Restriction Controls
    restrictions: {
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", userSchema);
export default User;
