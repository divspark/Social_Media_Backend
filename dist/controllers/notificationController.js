"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const dayjs_1 = __importDefault(require("dayjs"));
const relativeTime_1 = __importDefault(require("dayjs/plugin/relativeTime"));
const isToday_1 = __importDefault(require("dayjs/plugin/isToday"));
const isYesterday_1 = __importDefault(require("dayjs/plugin/isYesterday"));
dayjs_1.default.extend(relativeTime_1.default);
dayjs_1.default.extend(isToday_1.default);
dayjs_1.default.extend(isYesterday_1.default);
// Get grouped notifications (for admin & user)
const getNotifications = (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    return notificationModel_1.default.find({ receiverId: userId })
        .sort({ createdAt: -1 })
        .populate("senderId", "name photoURL")
        .then(notifications => {
        const grouped = {};
        notifications.forEach(notification => {
            const createdAt = (0, dayjs_1.default)(notification.createdAt);
            const groupLabel = createdAt.isToday()
                ? "Today"
                : createdAt.isYesterday()
                    ? "Yesterday"
                    : createdAt.format("DD MMM YYYY");
            if (!grouped[groupLabel])
                grouped[groupLabel] = [];
            const sender = notification.senderId;
            grouped[groupLabel].push({
                _id: notification._id,
                type: notification.type,
                postId: notification.postId,
                commentId: notification.commentId,
                isRead: notification.isRead,
                createdAt: notification.createdAt,
                timeAgo: createdAt.fromNow(),
                senderId: {
                    _id: sender._id,
                    name: sender.name,
                    photoURL: sender.photoURL,
                },
            });
        });
        res.status(200).json({ status: true, data: { data: grouped } });
    })
        .catch(error => {
        console.error("Failed to fetch notifications:", error);
        res.status(500).json({ status: false, message: "Failed to fetch notifications", data: { error: error } });
    });
};
exports.getNotifications = getNotifications;
// Mark a single notification as read (receiver only)
const markAsRead = (req, res) => {
    var _a;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    return notificationModel_1.default.findOne({ _id: id, receiverId: userId })
        .then(notification => {
        if (!notification) {
            res.status(404).json({ status: false, message: "Notification not found" });
            return;
        }
        notification.isRead = true;
        return notification.save().then(() => {
            res.status(200).json({ status: true, message: "Notification marked as read" });
        });
    })
        .catch(error => {
        console.error("Failed to mark as read:", error);
        res.status(500).json({ status: false, message: "Failed to mark as read", data: { error: error } });
    });
};
exports.markAsRead = markAsRead;
// Mark all notifications as read
const markAllAsRead = (req, res) => {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        res.status(401).json({ status: false, message: "Unauthorized" });
        return Promise.resolve();
    }
    return notificationModel_1.default.updateMany({ receiverId: userId, isRead: false }, { $set: { isRead: true } })
        .then(result => {
        res.status(200).json({
            status: true,
            message: `${result.modifiedCount} notifications marked as read`,
        });
    })
        .catch(error => {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({
            status: false,
            message: "Failed to mark all notifications as read",
            data: { error: error },
        });
    });
};
exports.markAllAsRead = markAllAsRead;
