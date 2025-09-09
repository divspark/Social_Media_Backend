import { Request, Response } from "express";
import { sendOtpWhatsapp } from "../utils/whatsappApi";
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
    res.status(400).json({ status: false, message: "Missing required fields"   });
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
          status: false,
          message: "OTP already sent. Please wait before requesting again."
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
            status: true,
            data:{expiresIn: 60}
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
        res.status(500).json({ status: false,message:"Rate limiy reached! Try after some time", data: { error: msg }   });
      }
    });
}

/**
 * POST /api/whatsapp/verify-otp
 */
export async function verifyOtpController(req: Request, res: Response): Promise<void> {
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
    const record = await OTPModel.findOne({ phoneNumber: mobile, otp });

    if (!record) {
      res.status(400).json({
        status: false,
        message: "Invalid OTP",
        data: {}
      });
      return;
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await OTPModel.deleteOne({ _id: record._id });
      res.status(400).json({
        status: false,
        message: "OTP expired",
        data: {}
      });
      return;
    }

    // OTP is valid → delete OTP
    await OTPModel.deleteOne({ _id: record._id });

    // Fetch or create user
    let user = await User.findOne({ phone: mobile });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
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
    const token = jwt.sign(payload, JWT_SECRET!, { noTimestamp: true });

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
      data: {
        token,
        phone: mobile,
        role: user.role,
        id: user._id,
        type: "phone",
        ...(user.name && { name: user.name }),
      },
    });
  } catch (err) {
    console.error("[VERIFY OTP ERROR]", err);
    res.status(500).json({
      status: false,
      message: "Internal error",
      data: { error: err },
    });
  }
}

export async function logoutController(req: Request, res: Response): Promise<void> {
  try {
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: true, 
      sameSite: "strict",
      path: "/",    
    });

    res.status(200).json({ status: true,  message: "Logged out successfully"  });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ status: false, message: "Internal server error"   });
  }
}