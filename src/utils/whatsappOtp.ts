import { OTPModel } from '../models/whatsappOtpModel';

/**
 * Generates a random 6-digit OTP and 60-second expiry timestamp.
 */
export const generateOTP = (): { otp: string; expiresAt: Date } => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 60 * 1000);
  return { otp, expiresAt };
};

/**
 * Checks if a user can request a new OTP (rate-limiting/cooldown).
 * @returns Promise<boolean>
 */
export const canSendOtp = (phoneNumber: string): Promise<boolean> => {
  return OTPModel.findOne({ phoneNumber })
    .sort({ createdAt: -1 })
    .then(record => {
      if (!record || !record.expiresAt) return true;
      return Date.now() > record.expiresAt.getTime();
    })
    .catch(() => true); // On DB issue, let them proceed
};
