import { Request, Response, NextFunction } from "express";
import admin from "../config/firebase";
import User from "../models/userModel";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

declare module "express-serve-static-core" {
  interface Request {
    user?: any;
  }
}

export const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized: Token missing" });
    return;
  }

  let token = authHeader.split(" ")[1];

  console.log("token",token)

  try {
    // 🔹 Phone login flow
    if (token.startsWith("phone_")) {
      token = token.replace("phone_", ""); // remove prefix

      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; phone: string; role: string };

      const user = await User.findOne({ phone: decoded.phone });
      if (!user) {
        res.status(401).json({ message: "Unauthorized: User not found" });
        return;
      }

      req.user = user;
      return next();
    }

    // 🔹 Google login flow (Firebase)
    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ uid: decodedToken.uid });

    if (!user) {
      res.status(401).json({ message: "Unauthorized: User not found" });
      return;
    }

    // Optionally save FCM token
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
