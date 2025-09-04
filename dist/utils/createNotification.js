"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = void 0;
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const createNotification = (params) => {
    const { senderId, receiverId, postId, commentId, type } = params;
    // Optional: don't create notification if sender = receiver
    if (senderId === receiverId)
        return Promise.resolve();
    const notification = new notificationModel_1.default({
        senderId,
        receiverId,
        postId,
        commentId,
        type,
        isRead: false,
    });
    return notification.save()
        .then(() => console.log(`Notification created: ${type} from ${senderId} to ${receiverId}`))
        .catch(err => console.error("Failed to create notification:", err));
};
exports.createNotification = createNotification;
