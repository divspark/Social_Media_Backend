"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canSendOtp = exports.generateOTP = void 0;
const whatsappOtpModel_1 = require("../models/whatsappOtpModel");
/**
 * Generates a random 6-digit OTP and 60-second expiry timestamp.
 */
const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = new Date(Date.now() + 60 * 1000);
    return { otp, expiresAt };
};
exports.generateOTP = generateOTP;
/**
 * Checks if a user can request a new OTP (rate-limiting/cooldown).
 * @returns Promise<boolean>
 */
const canSendOtp = (phoneNumber) => {
    return whatsappOtpModel_1.OTPModel.findOne({ phoneNumber })
        .sort({ createdAt: -1 })
        .then(record => {
        if (!record || !record.expiresAt)
            return true;
        return Date.now() > record.expiresAt.getTime();
    })
        .catch(() => true); // On DB issue, let them proceed
};
exports.canSendOtp = canSendOtp;
