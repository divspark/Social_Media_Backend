"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtp = sendOtp;
exports.verifyOtpController = verifyOtpController;
const whatsappApi_1 = require("../models/whatsappApi");
const whatsappOtpModel_1 = require("../models/whatsappOtpModel");
const whatsappOtp_1 = require("../utils/whatsappOtp");
const userModel_1 = __importDefault(require("../models/userModel"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
/**
 * POST /api/whatsapp/send-otp
 */
function sendOtp(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { mobile } = req.body;
        if (!mobile) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }
        let user = yield userModel_1.default.findOne({ phone: mobile });
        if (!user) {
            user = yield userModel_1.default.create({
                phone: mobile,
                role: "pending"
            });
            console.log("Created User Successfully");
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
            return (0, whatsappApi_1.sendOtpWhatsapp)(mobile, otp)
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
    });
}
/**
 * POST /api/whatsapp/verify-otp
 */
function verifyOtpController(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { mobile, otp } = req.body;
        if (!mobile || !otp) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }
        try {
            const record = yield whatsappOtpModel_1.OTPModel.findOne({ phoneNumber: mobile, otp });
            if (!record) {
                res.status(400).json({ error: "Invalid OTP" });
                return;
            }
            if (record.expiresAt.getTime() < Date.now()) {
                yield whatsappOtpModel_1.OTPModel.deleteOne({ _id: record._id });
                res.status(400).json({ error: "OTP expired" });
                return;
            }
            // OTP is valid → delete OTP
            yield whatsappOtpModel_1.OTPModel.deleteOne({ _id: record._id });
            // Fetch the user for role
            const user = yield userModel_1.default.findOne({ phone: mobile });
            if (!user) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            const payload = {
                id: user._id,
                phone: mobile,
                role: user.role,
            };
            const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "7d" });
            res.status(200).json({
                message: "OTP verified successfully",
                token: `phone_${token}`,
                phone: mobile,
                role: user.role,
                type: "phone"
            });
        }
        catch (err) {
            console.error("[VERIFY OTP ERROR]", err);
            res.status(500).json({ error: "Internal error" });
        }
    });
}
