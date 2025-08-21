"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtp = sendOtp;
exports.verifyOtpController = verifyOtpController;
const whatsappApi_1 = require("../models/whatsappApi");
const whatsappOtpModel_1 = require("../models/whatsappOtpModel");
const whatsappOtp_1 = require("../utils/whatsappOtp");
// Always use env
const authkey = process.env.AUTHKEY || "";
const wid = process.env.WID || "";
const countryCode = process.env.COUNTRY_CODE || "";
/**
 * POST /api/whatsapp/send-otp
 */
function sendOtp(req, res) {
    const { mobile, name } = req.body;
    if (!mobile || !name) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }
    (0, whatsappOtp_1.canSendOtp)(mobile)
        .then((canSend) => {
        if (!canSend) {
            res.status(429).json({
                error: "OTP already sent. Please wait before requesting again."
            });
            return Promise.reject("rate_limit");
        }
        // Remove old OTPs
        return whatsappOtpModel_1.OTPModel.deleteMany({ phoneNumber: mobile });
    })
        .then(() => {
        const { otp, expiresAt } = (0, whatsappOtp_1.generateOTP)();
        // Pass proper template vars according to Authkey template placeholders
        return (0, whatsappApi_1.sendOtpWhatsapp)(authkey, mobile, countryCode, wid, name, // will be mapped to var1 or correct placeholder
        otp // will be mapped to var2 or correct placeholder
        )
            .then(() => whatsappOtpModel_1.OTPModel.create({ phoneNumber: mobile, otp, expiresAt }))
            .then(() => res.status(200).json({
            message: "OTP sent successfully",
            expiresIn: 60
        }));
    })
        .catch((err) => {
        if (err !== "rate_limit") {
            console.error("[SEND OTP ERROR]", err);
            const msg = (err && typeof err === "object" && "Message" in err && err.Message) ||
                (err && typeof err === "object" && "error" in err && err.error) ||
                (typeof err === "string" && err) ||
                "Internal error";
            res.status(500).json({ error: msg });
        }
    });
}
/**
 * POST /api/whatsapp/verify-otp
 */
function verifyOtpController(req, res) {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }
    whatsappOtpModel_1.OTPModel.findOne({ phoneNumber: mobile, otp })
        .then((record) => {
        if (!record)
            return res.status(400).json({ error: "Invalid OTP" });
        if (record.expiresAt.getTime() < Date.now()) {
            whatsappOtpModel_1.OTPModel.deleteOne({ _id: record._id }).then(() => {
                res.status(400).json({ error: "OTP expired" });
            });
            return;
        }
        whatsappOtpModel_1.OTPModel.deleteOne({ _id: record._id }).then(() => {
            res.status(200).json({ message: "OTP verified successfully" });
        });
    })
        .catch((err) => {
        console.error("[VERIFY OTP ERROR]", err);
        res.status(500).json({ error: "Internal error" });
    });
}
