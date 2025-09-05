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
      res.status(401).json({ status: false,  message: "User authentication failed"   });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ status: false, message: "User not found"   });
      return;
    }

    if (user.isBlocked) {
      if (!user.blockedUntil) {
        res.status(403).json({
          message: "You are permanently blocked from all activities.",status: false
        });
        return;
      }

      const now = new Date();
      if (user.blockedUntil > now) {
        res.status(403).json({
          message: `You are temporarily blocked until ${user.blockedUntil.toLocaleString()}.`,status: false
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
    res.status(500).json({ status: false,  message: "Block check failed", data: { error: err }   });
  }
};
