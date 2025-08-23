"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const postRoutes_1 = __importDefault(require("./routes/postRoutes"));
const commentRoutes_1 = __importDefault(require("./routes/commentRoutes"));
const notification_1 = __importDefault(require("./routes/notification"));
const dailyMessageRoutes_1 = __importDefault(require("./routes/dailyMessageRoutes"));
const whatsappOTPRoute_1 = __importDefault(require("./routes/whatsappOTPRoute"));
const dotenv_1 = __importDefault(require("dotenv"));
const middlewares_1 = require("./middlewares");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use("/api/auth", authRoutes_1.default);
app.use("/api/post", middlewares_1.verifyToken, postRoutes_1.default);
app.use("/api/comment", middlewares_1.verifyToken, middlewares_1.checkBlockedUser, commentRoutes_1.default);
app.use("/api/notifications", middlewares_1.verifyToken, middlewares_1.checkBlockedUser, (0, middlewares_1.checkFeatureAccess)("notification"), notification_1.default);
app.use("/api/daily-message", middlewares_1.verifyToken, dailyMessageRoutes_1.default);
app.use("/api/whatsapp", whatsappOTPRoute_1.default);
app.get("/", (req, res) => {
    res.send("Api Service is healthy!");
});
exports.default = app;
