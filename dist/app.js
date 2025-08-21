"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/app.ts
const express_1 = __importDefault(require("express"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const postRoutes_1 = __importDefault(require("./routes/postRoutes"));
const commentRoutes_1 = __importDefault(require("./routes/commentRoutes"));
const notification_1 = __importDefault(require("./routes/notification"));
const dailyMessageRoutes_1 = __importDefault(require("./routes/dailyMessageRoutes"));
const whatsappOTPRoute_1 = __importDefault(require("./routes/whatsappOTPRoute"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
//all routes 
app.use("/api/auth", authRoutes_1.default);
app.use("/api/post", postRoutes_1.default);
app.use("/api/comment", commentRoutes_1.default);
// notification
app.use("/api/notifications", notification_1.default);
app.use("/api/daily-message", dailyMessageRoutes_1.default);
// whatsapp OTP
app.use("/api/whatsapp", whatsappOTPRoute_1.default);
exports.default = app;
