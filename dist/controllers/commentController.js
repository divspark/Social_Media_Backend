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
exports.toggleLikeComment = exports.getCommentsByPost = exports.deleteComment = exports.replyToComment = exports.addComment = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dayjs_1 = __importDefault(require("dayjs"));
const relativeTime_1 = __importDefault(require("dayjs/plugin/relativeTime"));
const commentModel_1 = __importDefault(require("../models/commentModel"));
const userModel_1 = __importDefault(require("../models/userModel"));
const postModel_1 = __importDefault(require("../models/postModel"));
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const sendNotification_1 = require("../utils/sendNotification");
dayjs_1.default.extend(relativeTime_1.default);
//Add a Comment (Only once per post per user)
const addComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { postId, content } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        res.status(401).json({ status: "failed", message: "Unauthorized" });
        return;
    }
    try {
        const existingComment = yield commentModel_1.default.findOne({ postId, userId });
        if (existingComment) {
            res.status(400).json({ status: "failed", message: "You have already commented on this post." });
            return;
        }
        const comment = yield commentModel_1.default.create({ postId, userId, content });
        const populated = yield comment.populate("userId", "name photoURL");
        // Notify Post Admin
        const post = yield postModel_1.default.findById(postId);
        if (post) {
            const admin = yield userModel_1.default.findById(post.adminId);
            if (admin === null || admin === void 0 ? void 0 : admin.fcmToken) {
                yield (0, sendNotification_1.sendNotification)(admin.fcmToken, "New Comment", "Someone commented on your post");
            }
            yield notificationModel_1.default.create({
                senderId: userId,
                receiverId: post.adminId,
                type: "comment",
                postId: post._id,
            });
        }
        res.status(201).json({
            message: "Comment added successfully",
            status: "success",
            data: {
                comment: Object.assign(Object.assign({}, populated.toObject()), { timeAgo: (0, dayjs_1.default)(comment.createdAt).fromNow() }),
            }
        });
    }
    catch (error) {
        console.error("Add Comment Error:", error);
        res.status(500).json({ status: "failed", message: "Failed to add comment", error });
    }
});
exports.addComment = addComment;
// Admin Reply to a Comment (Only once)
const replyToComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { commentId } = req.params;
    const { content } = req.body;
    const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!adminId || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== "admin") {
        res.status(403).json({ status: "failed", message: "Only admin can reply to comments" });
        return;
    }
    try {
        const comment = yield commentModel_1.default.findById(commentId);
        if (!comment) {
            res.status(404).json({ status: "failed", message: "Comment not found" });
            return;
        }
        if ((_c = comment.reply) === null || _c === void 0 ? void 0 : _c.content) {
            res.status(400).json({ status: "failed", message: "This comment already has a reply." });
            return;
        }
        comment.reply = {
            content,
            adminId: new mongoose_1.default.Types.ObjectId(adminId),
            createdAt: new Date(),
        };
        yield comment.save();
        // Notify User
        const user = yield userModel_1.default.findById(comment.userId);
        if (user === null || user === void 0 ? void 0 : user.fcmToken) {
            yield (0, sendNotification_1.sendNotification)(user.fcmToken, "Admin Replied", "Admin replied to your comment");
        }
        yield notificationModel_1.default.create({
            senderId: adminId,
            receiverId: comment.userId,
            type: "reply",
            postId: comment.postId,
        });
        const updated = yield commentModel_1.default.findById(commentId).populate("reply.adminId", "name photoURL");
        res.status(200).json({
            message: "Reply added successfully",
            status: "success",
            data: {
                comment: updated,
            }
        });
    }
    catch (error) {
        console.error("Reply Error:", error);
        res.status(500).json({ status: "failed", message: "Failed to reply to comment", error });
    }
});
exports.replyToComment = replyToComment;
// Delete a Comment (User or Admin)
const deleteComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { commentId } = req.params;
    const currentUser = req.user;
    if (!currentUser) {
        res.status(401).json({ status: "failed", message: "Unauthorized" });
        return;
    }
    try {
        const comment = yield commentModel_1.default.findById(commentId);
        if (!comment) {
            res.status(404).json({ status: "failed", message: "Comment not found" });
            return;
        }
        const isOwner = comment.userId.toString() === currentUser._id.toString();
        const isAdmin = currentUser.role === "admin";
        if (isAdmin || isOwner) {
            yield commentModel_1.default.findByIdAndDelete(commentId);
            res.status(200).json({ status: "success", message: "Comment deleted successfully" });
        }
        else {
            res.status(403).json({ status: "failed", message: "Unauthorized to delete this comment" });
        }
    }
    catch (error) {
        console.error("Delete Comment Error:", error);
        res.status(500).json({ status: "failed", message: "Failed to delete comment", error });
    }
});
exports.deleteComment = deleteComment;
// Get Paginated Comments
const getCommentsByPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    try {
        const total = yield commentModel_1.default.countDocuments({ postId });
        const comments = yield commentModel_1.default.find({ postId })
            .populate("userId", "name photoURL")
            .populate("reply.adminId", "name photoURL")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const formatted = comments.map((comment) => {
            var _a;
            const c = comment.toObject();
            return Object.assign(Object.assign({}, c), { timeAgo: (0, dayjs_1.default)(comment.createdAt).fromNow(), reply: ((_a = c.reply) === null || _a === void 0 ? void 0 : _a.content)
                    ? Object.assign(Object.assign({}, c.reply), { timeAgo: (0, dayjs_1.default)(c.reply.createdAt).fromNow() }) : null });
        });
        res.status(200).json({
            message: "Comments fetched successfully",
            status: "success",
            data: {
                total,
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                comments: formatted,
            }
        });
    }
    catch (error) {
        console.error("Get Comments Error:", error);
        res.status(500).json({ status: "failed", message: "Failed to fetch comments", error });
    }
});
exports.getCommentsByPost = getCommentsByPost;
// Like / Unlike Comment
const toggleLikeComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { commentId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        res.status(400).json({ status: "failed", message: "User ID is required" });
        return;
    }
    try {
        const comment = yield commentModel_1.default.findById(commentId);
        if (!comment) {
            res.status(404).json({ status: "failed", message: "Comment not found" });
            return;
        }
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const alreadyLiked = comment.likes.some((id) => id.toString() === userObjectId.toString());
        if (alreadyLiked) {
            comment.likes = comment.likes.filter((id) => id.toString() !== userObjectId.toString());
        }
        else {
            comment.likes.push(userObjectId);
            // Notify comment owner
            const commentOwner = yield userModel_1.default.findById(comment.userId);
            if (commentOwner && commentOwner.fcmToken) {
                yield (0, sendNotification_1.sendNotification)(commentOwner.fcmToken, "New Like", "Someone liked your comment");
            }
            yield notificationModel_1.default.create({
                senderId: userObjectId,
                receiverId: comment.userId,
                type: "like-comment",
                postId: comment.postId,
            });
        }
        yield comment.save();
        res.status(200).json({
            message: alreadyLiked ? "Comment unliked" : "Comment liked",
            status: "success",
            data: {
                likesCount: comment.likes.length,
            }
        });
    }
    catch (error) {
        console.error("Toggle Like Error:", error);
        res.status(500).json({ status: "failed", message: "Failed to like/unlike comment", error });
    }
});
exports.toggleLikeComment = toggleLikeComment;
