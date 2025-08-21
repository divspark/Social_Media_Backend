import express from "express";
import {
  createDailyMessage,
  getAllDailyMessages,
  updateDailyMessage,
  deleteDailyMessage,
  getDailyMessageById,
} from "../controllers/dailyMessageController";

import { requireAdmin,checkBlockedUser,checkFeatureAccess } from "../middlewares";

const router = express.Router();

router.post("/postDailyMsg", requireAdmin, createDailyMessage);
router.get("/getAllDailyMsg",checkBlockedUser,checkFeatureAccess("post"),getAllDailyMessages); // Public (users)
  
router.get("/dailyMsgById/:id",checkBlockedUser,checkFeatureAccess("post"),getDailyMessageById);
router.put("/updateDailyMsg/:id", requireAdmin, updateDailyMessage);
router.delete("/deleteDailyMsg/:id", requireAdmin, deleteDailyMessage);

export default router;
