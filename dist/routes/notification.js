"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const checkBlockedUser_1 = require("../middlewares/checkBlockedUser");
const checkFeatureRestriction_1 = require("../middlewares/checkFeatureRestriction");
const router = express_1.default.Router();
// ✅ Get all notifications
router.get("/getAllNotifications", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, (0, checkFeatureRestriction_1.checkFeatureAccess)("notification"), notificationController_1.getNotifications);
// ✅ Mark a specific notification as read
router.patch("/notifications/:id/read", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, (0, checkFeatureRestriction_1.checkFeatureAccess)("notification"), notificationController_1.markAsRead);
// ✅ Mark all notifications as read
router.patch("/notifications/mark-all-read", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, (0, checkFeatureRestriction_1.checkFeatureAccess)("notification"), notificationController_1.markAllAsRead);
exports.default = router;
