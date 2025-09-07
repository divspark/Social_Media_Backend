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
exports.logoutController = logoutController;
const whatsappApi_1 = require("../models/whatsappApi");
const whatsappOtpModel_1 = require("../models/whatsappOtpModel");
const whatsappOtp_1 = require("../utils/whatsappOtp");
const userModel_1 = __importDefault(require("../models/userModel"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
/**
 * POST /api/whatsapp/send-otp
 */
function sendOtp(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { mobile } = req.body;
        if (!mobile) {
            res.status(400).json({ status: false, message: "Missing required fields" });
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
                    status: false,
                    message: "OTP already sent. Please wait before requesting again."
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
                status: true,
                data: { expiresIn: 60 }
            }));
        })
            .catch((err) => {
            if (err !== "rate_limit") {
                console.error("[SEND OTP ERROR]", err);
                const msg = (err && typeof err === "object" && "Message" in err && err.Message) ||
                    (err && typeof err === "object" && "error" in err && err.error) ||
                    (typeof err === "string" && err) ||
                    "Internal error";
                res.status(500).json({ status: false, message: "Rate limiy reached! Try after some time", data: { error: msg } });
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
            res.status(400).json({
                status: false,
                message: "Missing required fields",
                data: {}
            });
            return;
        }
        try {
            const record = yield whatsappOtpModel_1.OTPModel.findOne({ phoneNumber: mobile, otp });
            if (!record) {
                res.status(400).json({
                    status: false,
                    message: "Invalid OTP",
                    data: {}
                });
                return;
            }
            if (record.expiresAt.getTime() < Date.now()) {
                yield whatsappOtpModel_1.OTPModel.deleteOne({ _id: record._id });
                res.status(400).json({
                    status: false,
                    message: "OTP expired",
                    data: {}
                });
                return;
            }
            // OTP is valid → delete OTP
            yield whatsappOtpModel_1.OTPModel.deleteOne({ _id: record._id });
            // Fetch or create user
            let user = yield userModel_1.default.findOne({ phone: mobile });
            let isNewUser = false;
            if (!user) {
                user = yield userModel_1.default.create({
                    phone: mobile,
                    role: "pending"
                });
                isNewUser = true;
            }
            // Prepare payload
            const payload = {
                id: user._id,
                phone: mobile,
                role: user.role,
            };
            // Sign JWT
            const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { noTimestamp: true });
            // Set JWT in secure httpOnly cookie
            res.cookie("auth_token", token, {
                httpOnly: true,
                secure: true, // ensure HTTPS in production
                sameSite: "strict",
                path: "/",
            });
            res.status(isNewUser ? 201 : 200).json({
                status: true,
                message: isNewUser
                    ? "New phone user created, please complete profile"
                    : "OTP verified successfully",
                data: Object.assign({ token, phone: mobile, role: user.role, id: user._id, type: "phone" }, (user.name && { name: user.name })),
            });
        }
        catch (err) {
            console.error("[VERIFY OTP ERROR]", err);
            res.status(500).json({
                status: false,
                message: "Internal error",
                data: { error: err },
            });
        }
    });
}
function logoutController(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            res.clearCookie("auth_token", {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
                path: "/",
            });
            res.status(200).json({ status: true, message: "Logged out successfully" });
        }
        catch (err) {
            console.error("Logout error:", err);
            res.status(500).json({ status: false, message: "Internal server error" });
        }
    });
}
