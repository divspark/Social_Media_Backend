import express from "express";
import cors from "cors";
import AuthRoutes from "./routes/authRoutes"; 
import postRoutes from "./routes/postRoutes"; 
import commentRoute from "./routes/commentRoutes"
import notificationRoutes from "./routes/notification";
import dailyMessageRoutes from "./routes/dailyMessageRoutes";
import whatsappRoutes from "./routes/whatsappOTPRoute";
import dotenv from "dotenv";
import { verifyToken,checkBlockedUser,checkFeatureAccess } from "./middlewares";

dotenv.config();

const app = express();

app.use(express.json());

app.use(cors());

app.use("/api/auth",AuthRoutes);
app.use("/api/post",verifyToken,postRoutes);
app.use("/api/comment",verifyToken,checkBlockedUser,commentRoute);
app.use("/api/notifications",verifyToken,checkBlockedUser,checkFeatureAccess("notification"), notificationRoutes);
app.use("/api/daily-message",verifyToken, dailyMessageRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.get("/", (req, res) => {
    res.send("Api Service is healthy!");
});

export default app;
