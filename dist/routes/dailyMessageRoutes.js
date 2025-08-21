"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dailyMessageController_1 = require("../controllers/dailyMessageController");
const middlewares_1 = require("../middlewares");
const router = express_1.default.Router();
router.post("/postDailyMsg", middlewares_1.requireAdmin, dailyMessageController_1.createDailyMessage);
router.get("/getAllDailyMsg", middlewares_1.checkBlockedUser, (0, middlewares_1.checkFeatureAccess)("post"), dailyMessageController_1.getAllDailyMessages); // Public (users)
router.get("/dailyMsgById/:id", middlewares_1.checkBlockedUser, (0, middlewares_1.checkFeatureAccess)("post"), dailyMessageController_1.getDailyMessageById);
router.put("/updateDailyMsg/:id", middlewares_1.requireAdmin, dailyMessageController_1.updateDailyMessage);
router.delete("/deleteDailyMsg/:id", middlewares_1.requireAdmin, dailyMessageController_1.deleteDailyMessage);
exports.default = router;
