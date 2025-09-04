"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const whatsappOTPController_1 = require("../controllers/whatsappOTPController");
const router = (0, express_1.Router)();
router.post("/send-otp", whatsappOTPController_1.sendOtp);
router.post("/verify-otp", whatsappOTPController_1.verifyOtpController);
router.post("logout", whatsappOTPController_1.logoutController);
exports.default = router;
