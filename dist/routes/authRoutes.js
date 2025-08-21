"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const checkFeatureRestriction_1 = require("../middlewares/checkFeatureRestriction");
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
const router = (0, express_1.Router)();
// Email & Phone Login (Auto Create if not exists)
router.post("/email-login", authController_1.googleLoginOrCreate);
router.post("/phone-login", authController_1.phoneLoginOrCreate);
// Second Form - Complete Profile
router.post("/complete-profile", authMiddleware_1.verifyFirebaseToken, upload.single("file"), // expects form field "file"
(0, checkFeatureRestriction_1.checkFeatureAccess)("profileUpdate"), authController_1.completeProfile);
//Update profile later
router.put("/update-profile", authMiddleware_1.verifyFirebaseToken, upload.single("file"), (0, checkFeatureRestriction_1.checkFeatureAccess)("profileUpdate"), authController_1.updateOwnProfile);
//Get current user profile
router.get("/get-profile", authMiddleware_1.verifyFirebaseToken, authController_1.getOwnProfile);
//Admin ↔ User profile by UID
router.get("/getProfileById/:uid", authMiddleware_1.verifyFirebaseToken, authController_1.getUserProfileByUID);
router.post("/saveFcmToken", authMiddleware_1.verifyFirebaseToken, authController_1.saveFcmToken);
// Block / Unblock user
router.post("/block", authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireAdmin, authController_1.blockOrUnblockUser);
router.get("/getAllblockedUser", authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireAdmin, authController_1.getBlockedUsers);
// Set user restrictions
router.post("/restrict", authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireAdmin, authController_1.setUserRestrictions);
//  Get All Users With Restrictions
router.get("/getRestricted-users", authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireAdmin, authController_1.getRestrictedUsers);
// Get all blocked users
exports.default = router;
