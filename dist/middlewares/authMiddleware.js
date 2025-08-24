"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = exports.requireAdmin = exports.verifyToken = void 0;
const userModel_1 = __importDefault(require("../models/userModel"));
const JWT_SECRET = process.env.JWT_SECRET;
const verifyToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // let token: string | undefined;
        // // First, check Authorization header
        // const authHeader = req.headers.authorization;
        // if (authHeader?.startsWith("Bearer ")) {
        //   token = authHeader.split(" ")[1];
        // }
        // // If not in header, check cookie
        // if (!token && req.cookies?.auth_token) {
        //   token = req.cookies.auth_token;
        // }
        // if (!token) {
        //   res.status(401).json({ message: "Unauthorized: Token missing" });
        //   return;
        // }
        // // Phone flow
        // if (token.startsWith("phone_")) {
        //   const decoded = jwt.verify(token.replace("phone_", ""), JWT_SECRET!) as {
        //     id: string;
        //     phone: string;
        //     role: string;
        //   };
        //   const user = await User.findOne({ phone: decoded.phone });
        //   if (!user) {
        //     res.status(401).json({ message: "Unauthorized: User not found" });
        //     return;
        //   }
        //   req.user = user;
        //   return next();
        // }
        // // 🔹 Google login flow (Firebase)
        // const decodedToken = await admin.auth().verifyIdToken(token);
        const user = yield userModel_1.default.findOne({ uid: "TqwO6u9OREYX0Huo1JlR6XiAACp1" });
        if (!user) {
            res.status(401).json({ message: "Unauthorized: User not found" });
            return;
        }
        // Optionally save FCM token
        const fcmToken = req.headers["x-fcm-token"];
        if (fcmToken && typeof fcmToken === "string" && user.fcmToken !== fcmToken) {
            user.fcmToken = fcmToken;
            yield user.save();
        }
        console.log(user);
        req.user = user;
        next();
    }
    catch (err) {
        console.error("Token verification error:", err);
        res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
});
exports.verifyToken = verifyToken;
// Admin-only access
const requireAdmin = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        res.status(403).json({ message: "Forbidden: Admins only" });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
//User-only access
const requireUser = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "user") {
        res.status(403).json({ message: "Forbidden: Users only" });
        return;
    }
    next();
};
exports.requireUser = requireUser;
