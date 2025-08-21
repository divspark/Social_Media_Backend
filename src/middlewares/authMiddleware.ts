import { Request, Response, NextFunction } from "express";
import admin from "../config/firebase";
import User from "../models/userModel";

declare module "express-serve-static-core" {
  interface Request {
    user?: any;
  }
}

export const verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized: Token missing" });
    return;
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const user = await User.findOne({ uid: decodedToken.uid });

    if (!user) {
      res.status(401).json({ message: "Unauthorized: User not found" });
      return;
    }

    // Save FCM token if provided in request headers
    const fcmToken = req.headers["x-fcm-token"];
    if (fcmToken && typeof fcmToken === "string" && user.fcmToken !== fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

// Admin-only access
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "Forbidden: Admins only" });
    return;
  }
  next();
};

//User-only access
export const requireUser = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "user") {
    res.status(403).json({ message: "Forbidden: Users only" });
    return;
  }
  next();
};
