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
        res.status(401).json({ status: false, message: "Unauthorized"   });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ status: false, message: "User not found"   });
        return;
      }

      const isRestricted = user.restrictions?.get(feature) ?? false;
      if (isRestricted) {
        res.status(403).json({
          message: `You are restricted from using the '${feature}' feature.`,
          status: false
        });
        return;
      }

      next();
    } catch (err) {
      res.status(500).json({ status: false, message: "Feature access check failed", data: { error: err }   });
    }
  };
