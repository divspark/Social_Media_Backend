import express from "express";
import AuthRoutes from "./routes/authRoutes"; 
import postRoutes from "./routes/postRoutes"; 
import commentRoute from "./routes/commentRoutes"
import notificationRoutes from "./routes/notification";
import dailyMessageRoutes from "./routes/dailyMessageRoutes";
import whatsappRoutes from "./routes/whatsappOTPRoute";
import dotenv from "dotenv";
import { verifyFirebaseToken,checkBlockedUser,checkFeatureAccess } from "./middlewares";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/api/auth",AuthRoutes);
app.use("/api/post",verifyFirebaseToken,postRoutes);
app.use("/api/comment",verifyFirebaseToken,checkBlockedUser,commentRoute);
app.use("/api/notifications",verifyFirebaseToken,checkBlockedUser,checkFeatureAccess("notification"), notificationRoutes);
app.use("/api/daily-message",verifyFirebaseToken, dailyMessageRoutes);
app.use("/api/whatsapp", whatsappRoutes);

export default app;
