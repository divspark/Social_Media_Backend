import express from "express";
import { getNotifications, markAsRead, markAllAsRead } from "../controllers/notificationController";

const router = express.Router();

router.get("/getAllNotifications",getNotifications);
router.patch("/:id/read",markAsRead);
router.patch("/mark-all-read",markAllAsRead);

export default router;
