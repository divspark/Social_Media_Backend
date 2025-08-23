import { Request, Response } from "express";
import { sendOtpWhatsapp } from "../models/whatsappApi";
import { OTPModel } from "../models/whatsappOtpModel";
import { generateOTP, canSendOtp } from "../utils/whatsappOtp";
import User from "../models/userModel";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * POST /api/whatsapp/send-otp
 */
export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { mobile } = req.body;
  if (!mobile) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  let user = await User.findOne({ phone:mobile });
  
  if (!user) {
    user = await User.create({
      phone:mobile,
      role: "pending"
    });
    console.log("Created User Successfully")
  }      

  canSendOtp(mobile)
    .then((canSend) => {
      if (!canSend) {
        res.status(429).json({
          error: "OTP already sent. Please wait before requesting again."
        });
        return Promise.reject("rate_limit");
      }
      // Remove old OTPs
      return OTPModel.deleteMany({ phoneNumber: mobile });
    })
    .then(() => {
      const { otp, expiresAt } = generateOTP();

      // Pass proper template vars according to Authkey template placeholders
      return sendOtpWhatsapp(
        mobile,
        otp,
      )
        .then(() => OTPModel.create({ phoneNumber: mobile, otp, expiresAt }))
        .then(() =>
          res.status(200).json({
            message: "OTP sent successfully",
            expiresIn: 60
          })
        );
    })
    .catch((err) => {
      if (err !== "rate_limit") {
        console.error("[SEND OTP ERROR]", err);
        const msg =
          (err && typeof err === "object" && "Message" in err && err.Message) ||
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
export async function verifyOtpController(req: Request, res: Response): Promise<void> {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const record = await OTPModel.findOne({ phoneNumber: mobile, otp });

    if (!record) {
      res.status(400).json({ error: "Invalid OTP" });
      return;
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await OTPModel.deleteOne({ _id: record._id });
      res.status(400).json({ error: "OTP expired" });
      return;
    }

    // OTP is valid → delete OTP
    await OTPModel.deleteOne({ _id: record._id });

    // Fetch the user for role
    const user = await User.findOne({ phone: mobile });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const payload = {
      id: user._id,
      phone: mobile,
      role: user.role,
    };

    const rawToken = jwt.sign(payload, JWT_SECRET!, { noTimestamp: true });
    const token = `phone_${rawToken}`;

    // Set JWT in secure httpOnly cookie
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true, // ensure HTTPS in production
      sameSite: "strict",
      path: "/",
    });

    res.status(200).json({
      message: "OTP verified successfully",
      token,
      phone: mobile,
      role: user.role,
      type: "phone"
    });
  } catch (err) {
    console.error("[VERIFY OTP ERROR]", err);
    res.status(500).json({ error: "Internal error" });
  }
}