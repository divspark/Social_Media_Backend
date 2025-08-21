// middlewares/checkFeatureRestriction.ts
import { Response, NextFunction } from "express";
import User from "../models/userModel";
import { AuthRequest } from "../controllers/authController";

export const checkFeatureAccess =
  (feature: string) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const isRestricted = user.restrictions?.get(feature) ?? false;
      if (isRestricted) {
        res.status(403).json({
          message: `You are restricted from using the '${feature}' feature.`,
        });
        return;
      }

      next();
    } catch (err) {
      res.status(500).json({ message: "Feature access check failed", error: err });
    }
  };
