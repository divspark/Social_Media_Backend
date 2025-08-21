import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOTP extends Document {
  phoneNumber: string;
  otp: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    phoneNumber: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true } 
  },
  { timestamps: true }
);

// Only add the TTL index ONCE
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTPModel: Model<IOTP> = mongoose.model<IOTP>('OTP', otpSchema);
