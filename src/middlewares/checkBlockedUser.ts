import { NextFunction, Response } from "express";
import User from "../models/userModel";
import { AuthRequest } from "../controllers/authController";

export const checkBlockedUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: "User authentication failed" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.isBlocked) {
      if (!user.blockedUntil) {
        res.status(403).json({
          message: "You are permanently blocked from all activities."
        });
        return;
      }

      const now = new Date();
      if (user.blockedUntil > now) {
        res.status(403).json({
          message: `You are temporarily blocked until ${user.blockedUntil.toLocaleString()}.`
        });
        return;
      }

      // Auto-unblock if block duration has passed
      user.isBlocked = false;
      user.blockedUntil = null;
      user.blockReason = "";
      await user.save();
    }

    next();
  } catch (err) {
    res.status(500).json({ message: "Block check failed", error: err });
  }
};
