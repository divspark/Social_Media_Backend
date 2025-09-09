import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/userModel";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AuthRequest } from "../controllers/authController";

declare module "express-serve-static-core" {
  interface Request {
    user?: IUser;
  }
}

export const JWT_SECRET = process.env.JWT_SECRET || "secret";

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      res.status(401).json({
        status: false,
        message: "Unauthorized: Token not provided",
        data: {},
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (!decoded?.id) {
      res.status(401).json({
        status: false,
        message: "Unauthorized: Invalid token payload",
        data: {},
      });
      return;
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({
        status: false,
        message: "Unauthorized: User not found",
        data: {},
      });
      return;
    }

    const fcmToken = req.headers["x-fcm-token"];
    if (fcmToken && typeof fcmToken === "string" && user.fcmToken !== fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }

    // Attach the full user document
    req.user= user;

    next();
  } catch (error) {
    res.status(401).json({
      status: false,
      message: "Unauthorized: Invalid token",
      data: {},
    });
    return;
  }
};

// Admin-only access
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ status: false,  message: "Forbidden: Admins only"   });
    return;
  }
  next();
};

//User-only access
export const requireUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== "user") {
    res.status(403).json({ status: false,message: "Forbidden: Users only"   });
    return;
  }
  next();
};
