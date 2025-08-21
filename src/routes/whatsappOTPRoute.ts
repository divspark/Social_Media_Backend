import { Router } from "express";
import { sendOtp, verifyOtpController } from "../controllers/whatsappOTPController";

const router = Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtpController);

export default router;
