import { Router } from "express";
import { logoutController, sendOtp, verifyOtpController } from "../controllers/whatsappOTPController";

const router = Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtpController);
router.post("logout",logoutController);

export default router;
