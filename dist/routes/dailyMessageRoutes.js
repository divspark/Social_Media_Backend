"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dailyMessageController_1 = require("../controllers/dailyMessageController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const checkBlockedUser_1 = require("../middlewares/checkBlockedUser");
const checkFeatureRestriction_1 = require("../middlewares/checkFeatureRestriction");
const router = express_1.default.Router();
router.post("/postDailyMsg", authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireAdmin, dailyMessageController_1.createDailyMessage);
router.get("/getAllDailyMsg", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, (0, checkFeatureRestriction_1.checkFeatureAccess)("post"), dailyMessageController_1.getAllDailyMessages); // Public (users)
router.get("/dailyMsgById/:id", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, (0, checkFeatureRestriction_1.checkFeatureAccess)("post"), dailyMessageController_1.getDailyMessageById);
router.put("/updateDailyMsg/:id", authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireAdmin, dailyMessageController_1.updateDailyMessage);
router.delete("/deleteDailyMsg/:id", authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireAdmin, dailyMessageController_1.deleteDailyMessage);
exports.default = router;
