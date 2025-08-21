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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostAnalytics = exports.trackPostView = exports.sharePost = exports.getSavedPosts = exports.toggleSavePost = exports.toggleLikePost = exports.deletePost = exports.updatePost = exports.getPostsByCategory = exports.getPostById = exports.getAllPosts = exports.getPostVotePollById = exports.votePollOption = exports.createPost = void 0;
const postModel_1 = __importDefault(require("../models/postModel"));
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
const mongoose_1 = __importDefault(require("mongoose"));
const dayjs_1 = __importDefault(require("dayjs"));
const sendNotification_1 = require("../utils/sendNotification");
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const userModel_1 = __importDefault(require("../models/userModel"));
const relativeTime_1 = __importDefault(require("dayjs/plugin/relativeTime"));
dayjs_1.default.extend(relativeTime_1.default);
const createPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { content, postType, pollOptions, category } = req.body;
    const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        if (!category || typeof category !== "string") {
            res.status(400).json({ message: "Category is required" });
            return;
        }
        let images = [];
        let video;
        let videoThumbnail;
        // Upload Images
        if (req.files && "images" in req.files) {
            const imageFiles = req.files["images"];
            for (const file of imageFiles) {
                if (file.size > 15 * 1024 * 1024) {
                    res.status(400).json({ message: "Each image must be under 15MB" });
                    return;
                }
                const imageUrl = yield new Promise((resolve, reject) => {
                    const stream = cloudinary_1.default.uploader.upload_stream({
                        resource_type: "image",
                        folder: "posts/images",
                        format: "webp",
                        quality: "auto:good",
                    }, (error, result) => {
                        if (error || !result) {
                            console.error("❌ Image upload error:", error);
                            reject("Image upload failed");
                        }
                        else {
                            resolve(result.secure_url);
                        }
                    });
                    stream.end(file.buffer);
                });
                images.push(imageUrl);
            }
        }
        //  Upload Video (stream + async eager processing)
        if (req.files && "video" in req.files) {
            const videoFile = req.files["video"][0];
            if (videoFile.size > 1024 * 1024 * 1024) {
                res.status(400).json({ message: "Video too large (max 1GB)" });
                return;
            }
            video = yield new Promise((resolve, reject) => {
                const stream = cloudinary_1.default.uploader.upload_stream({
                    resource_type: "video",
                    folder: "posts/videos",
                    eager: [{ format: "mp4", quality: "auto" }],
                    eager_async: true,
                }, (error, result) => {
                    if (error || !result) {
                        console.error("🚨 Cloudinary video upload error:", error);
                        reject("Video upload failed");
                    }
                    else {
                        resolve(result.secure_url);
                    }
                });
                stream.end(videoFile.buffer);
            });
        }
        //  Upload Video Thumbnail
        if (req.files && "videoThumbnail" in req.files) {
            const thumbnailFile = req.files["videoThumbnail"][0];
            if (thumbnailFile.size > 5 * 1024 * 1024) {
                res.status(400).json({ message: "Thumbnail too large (max 5MB)" });
                return;
            }
            videoThumbnail = yield new Promise((resolve, reject) => {
                const stream = cloudinary_1.default.uploader.upload_stream({
                    resource_type: "image",
                    folder: "posts/thumbnails",
                    quality: "auto:eco",
                    format: "webp",
                }, (error, result) => {
                    if (error || !result) {
                        console.error("❌ Thumbnail upload error:", error);
                        reject("Thumbnail upload failed");
                    }
                    else {
                        resolve(result.secure_url);
                    }
                });
                stream.end(thumbnailFile.buffer);
            });
        }
        //  Save Post
        const post = yield postModel_1.default.create({
            adminId,
            content,
            postType,
            images,
            video,
            videoThumbnail,
            category,
            pollOptions: postType === "poll" ? JSON.parse(pollOptions || "[]") : [],
        });
        const populatedPost = yield post.populate("adminId", "_id name photoURL");
        const postObj = populatedPost.toObject();
        const admin = postObj.adminId;
        res.status(201).json({
            category: category.toLowerCase(),
            post: Object.assign(Object.assign({}, postObj), { timeAgo: (0, dayjs_1.default)(post.createdAt).fromNow(), adminId: {
                    _id: admin._id,
                    name: admin.name,
                    photoURL: admin.photoURL,
                } }),
        });
    }
    catch (err) {
        console.error("Create Post Error:", err);
        res.status(500).json({ message: "Failed to create post", error: err });
    }
});
exports.createPost = createPost;
// Helper: calculate vote percentages
function getVotePercentages(options) {
    const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0);
    return options.map((opt) => ({
        optionId: opt._id,
        option: opt.option,
        votes: opt.votes,
        percentage: totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(2) + "%" : "0%",
    }));
}
const votePollOption = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { postId, optionId } = req.body;
    // Validate IDs
    if (!mongoose_1.default.Types.ObjectId.isValid(postId) ||
        !mongoose_1.default.Types.ObjectId.isValid(optionId) ||
        !userId) {
        res.status(400).json({ message: "Invalid postId, optionId, or user not authenticated" });
        return;
    }
    try {
        const post = yield postModel_1.default.findById(postId);
        if (!post || post.postType !== "poll") {
            res.status(404).json({ message: "Poll post not found" });
            return;
        }
        // 🧹 Remove user's previous vote
        (_b = post.pollOptions) === null || _b === void 0 ? void 0 : _b.forEach((opt) => {
            var _a;
            const index = (_a = opt.voters) === null || _a === void 0 ? void 0 : _a.findIndex((v) => v.toString() === userId.toString());
            if (index !== -1) {
                opt.voters.splice(index, 1);
                opt.votes = Math.max(0, opt.votes - 1);
            }
        });
        //  Add vote to selected option
        const selectedOption = (_c = post.pollOptions) === null || _c === void 0 ? void 0 : _c.find((opt) => opt._id.toString() === optionId);
        if (!selectedOption) {
            res.status(404).json({ message: "Poll option not found" });
            return;
        }
        selectedOption.votes += 1;
        selectedOption.voters.push(new mongoose_1.default.Types.ObjectId(userId));
        yield post.save();
        const result = getVotePercentages(post.pollOptions || []);
        res.status(200).json({
            message: "Vote cast successfully",
            postId,
            votedOptionId: optionId,
            results: result,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Voting failed", error: err });
    }
});
exports.votePollOption = votePollOption;
const getPostVotePollById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "Invalid post ID" });
        return;
    }
    try {
        const post = yield postModel_1.default.findById(id).populate("adminId", "name photoURL");
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        const postObj = post.toObject();
        const timeAgo = (0, dayjs_1.default)(post.createdAt).fromNow();
        let pollResults;
        let userVotedOptionId;
        if (post.postType === "poll" && Array.isArray(post.pollOptions)) {
            // Check if user has voted
            for (const opt of post.pollOptions) {
                if ((_b = opt.voters) === null || _b === void 0 ? void 0 : _b.some((v) => v.toString() === (userId === null || userId === void 0 ? void 0 : userId.toString()))) {
                    userVotedOptionId = opt._id;
                    break;
                }
            }
            if (userVotedOptionId) {
                pollResults = getVotePercentages(post.pollOptions);
            }
        }
        res.status(200).json(Object.assign(Object.assign({}, postObj), { timeAgo, pollResults: pollResults || null, userVotedOptionId: userVotedOptionId || null }));
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch post", error: err });
    }
});
exports.getPostVotePollById = getPostVotePollById;
const getAllPosts = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const posts = yield postModel_1.default.find()
            .sort({ createdAt: -1 })
            .populate("adminId", "_id name photoURL");
        const formattedPosts = posts.map((post) => {
            const postObj = post.toObject();
            const admin = postObj.adminId;
            return Object.assign(Object.assign({}, postObj), { timeAgo: (0, dayjs_1.default)(post.createdAt).fromNow(), adminId: {
                    _id: admin._id,
                    name: admin.name,
                    photoURL: admin.photoURL,
                }, videoThumbnail: postObj.videoThumbnail || null });
        });
        res.status(200).json({ posts: formattedPosts });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch posts", error: err });
    }
});
exports.getAllPosts = getAllPosts;
const getPostById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const post = yield postModel_1.default.findById(req.params.id).populate("adminId", "_id name photoURL");
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        const postObj = post.toObject();
        const admin = postObj.adminId;
        const { category } = postObj, cleanedPost = __rest(postObj, ["category"]);
        res.status(200).json({
            category: (category === null || category === void 0 ? void 0 : category.toLowerCase()) || null,
            post: Object.assign(Object.assign({}, cleanedPost), { timeAgo: (0, dayjs_1.default)(post.createdAt).fromNow(), adminId: {
                    _id: admin._id,
                    name: admin.name,
                    photoURL: admin.photoURL,
                }, videoThumbnail: postObj.videoThumbnail || null }),
        });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch post", error: err });
    }
});
exports.getPostById = getPostById;
const getPostsByCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    try {
        const totalPosts = yield postModel_1.default.countDocuments({
            category: { $regex: new RegExp("^" + category + "$", "i") }
        });
        const posts = yield postModel_1.default.find({
            category: { $regex: new RegExp("^" + category + "$", "i") }
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("adminId", "_id name photoURL");
        const formattedPosts = posts.map(post => {
            const postObj = post.toObject();
            const admin = postObj.adminId;
            return Object.assign(Object.assign({}, postObj), { timeAgo: (0, dayjs_1.default)(post.createdAt).fromNow(), adminId: {
                    _id: admin._id,
                    name: admin.name,
                    photoURL: admin.photoURL,
                }, videoThumbnail: postObj.videoThumbnail || null });
        });
        res.status(200).json({
            category: category.toLowerCase(),
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            totalPosts,
            posts: formattedPosts,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch posts by category", error: err });
    }
});
exports.getPostsByCategory = getPostsByCategory;
// Update Post
const updatePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { content, postType, pollOptions, category } = req.body;
    try {
        const post = yield postModel_1.default.findOne({ _id: id, adminId });
        if (!post) {
            res.status(404).json({ message: "Post not found or unauthorized" });
            return;
        }
        let images = post.images || [];
        let video = post.video;
        let videoThumbnail = post.videoThumbnail;
        // Upload new images
        if (req.files && "images" in req.files) {
            const imageFiles = req.files["images"];
            images = [];
            for (const file of imageFiles) {
                const imageUrl = yield new Promise((resolve, reject) => {
                    const stream = cloudinary_1.default.uploader.upload_stream({
                        resource_type: "image",
                        folder: "posts/images",
                    }, (error, result) => {
                        if (error || !result)
                            reject("Image upload failed");
                        else
                            resolve(result.secure_url);
                    });
                    stream.end(file.buffer);
                });
                images.push(imageUrl);
            }
        }
        // Upload new video
        if (req.files && "video" in req.files) {
            const videoFile = req.files["video"][0];
            video = yield new Promise((resolve, reject) => {
                const stream = cloudinary_1.default.uploader.upload_stream({
                    resource_type: "video",
                    folder: "posts/videos",
                }, (error, result) => {
                    if (error || !result)
                        reject("Video upload failed");
                    else
                        resolve(result.secure_url);
                });
                stream.end(videoFile.buffer);
            });
        }
        // Upload new video thumbnail
        if (req.files && "videoThumbnail" in req.files) {
            const thumbnailFile = req.files["videoThumbnail"][0];
            videoThumbnail = yield new Promise((resolve, reject) => {
                const stream = cloudinary_1.default.uploader.upload_stream({
                    resource_type: "image",
                    folder: "posts/video-thumbnails",
                }, (error, result) => {
                    if (error || !result)
                        reject("Thumbnail upload failed");
                    else
                        resolve(result.secure_url);
                });
                stream.end(thumbnailFile.buffer);
            });
        }
        // Update post fields
        post.content = content || post.content;
        post.postType = postType || post.postType;
        post.images = images;
        post.video = video;
        post.videoThumbnail = videoThumbnail;
        post.pollOptions = postType === "poll" ? JSON.parse(pollOptions || "[]") : post.pollOptions;
        if (category && typeof category === "string") {
            post.category = category;
        }
        yield post.save();
        // Populate admin
        const populatedPost = yield post.populate("adminId", "_id name photoURL");
        const postObj = populatedPost.toObject();
        const admin = postObj.adminId;
        // Remove `category` from response
        const { category: _omitCategory } = postObj, cleanedPost = __rest(postObj, ["category"]);
        res.status(200).json({
            category: post.category.toLowerCase(),
            post: Object.assign(Object.assign({}, cleanedPost), { timeAgo: (0, dayjs_1.default)(post.createdAt).fromNow(), adminId: {
                    _id: admin._id,
                    name: admin.name,
                    photoURL: admin.photoURL,
                }, videoThumbnail: post.videoThumbnail || null }),
        });
    }
    catch (err) {
        console.error("Update Post Error:", err);
        res.status(500).json({ message: "Failed to update post", error: err });
    }
});
exports.updatePost = updatePost;
const deletePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        const post = yield postModel_1.default.findOne({ _id: id, adminId });
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        yield postModel_1.default.findByIdAndDelete(id);
        res.status(200).json({ message: "Post deleted successfully" });
    }
    catch (err) {
        res.status(500).json({ message: "Delete failed", error: err });
    }
});
exports.deletePost = deletePost;
// Like / Unlike Post
const toggleLikePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { postId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const objectUserId = new mongoose_1.default.Types.ObjectId(userId);
    try {
        const post = yield postModel_1.default.findById(postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        const isLiked = (_b = post.likes) === null || _b === void 0 ? void 0 : _b.some((id) => id.equals(objectUserId));
        if (isLiked) {
            post.likes = post.likes.filter((id) => !id.equals(objectUserId));
        }
        else {
            post.likes.push(objectUserId);
            // Notify Admin
            const adminUser = yield userModel_1.default.findById(post.adminId);
            if (adminUser === null || adminUser === void 0 ? void 0 : adminUser.fcmToken) {
                yield (0, sendNotification_1.sendNotification)(adminUser.fcmToken, "New Like", "Someone liked your post");
            }
            yield notificationModel_1.default.create({
                senderId: userId,
                receiverId: post.adminId,
                type: "like",
                postId: post._id,
            });
        }
        yield post.save();
        res.status(200).json({
            message: isLiked ? "Post unliked" : "Post liked",
            likesCount: post.likes.length,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to toggle like", error: err });
    }
});
exports.toggleLikePost = toggleLikePost;
// Save / Unsave Post
const toggleSavePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { postId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        res.status(400).json({ message: "User ID is required" });
        return;
    }
    const objectUserId = new mongoose_1.default.Types.ObjectId(userId);
    try {
        const post = yield postModel_1.default.findById(postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        const isSaved = (_b = post.savedBy) === null || _b === void 0 ? void 0 : _b.some((id) => id.equals(objectUserId));
        if (isSaved) {
            post.savedBy = post.savedBy.filter((id) => !id.equals(objectUserId));
        }
        else {
            post.savedBy.push(objectUserId);
            // Notify Admin (only when saved)
            const adminUser = yield userModel_1.default.findById(post.adminId);
            if (adminUser === null || adminUser === void 0 ? void 0 : adminUser.fcmToken) {
                yield (0, sendNotification_1.sendNotification)(adminUser.fcmToken, "Post Saved", "Someone saved your post");
            }
            yield notificationModel_1.default.create({
                senderId: userId,
                receiverId: post.adminId,
                type: "save",
                postId: post._id,
            });
        }
        yield post.save();
        res.status(200).json({
            message: isSaved ? "Post unsaved" : "Post saved",
            savedCount: post.savedBy.length,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to toggle save", error: err });
    }
});
exports.toggleSavePost = toggleSavePost;
// Get All Saved Posts (by User)
const getSavedPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        const posts = yield postModel_1.default.find({ savedBy: userId })
            .sort({ createdAt: -1 })
            .populate("adminId", "name photoURL");
        res.status(200).json({ savedPosts: posts });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch saved posts", error: err });
    }
});
exports.getSavedPosts = getSavedPosts;
// Share Post (tracks shareCount & sharedBy for analytics)
const sharePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { postId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        res.status(400).json({ message: "User ID is required" });
        return;
    }
    try {
        const post = yield postModel_1.default.findById(postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        const alreadyShared = (_b = post.sharedBy) === null || _b === void 0 ? void 0 : _b.some((id) => id.toString() === userId.toString());
        if (!alreadyShared) {
            post.sharedBy.push(new mongoose_1.default.Types.ObjectId(userId));
            post.shareCount += 1;
            yield post.save();
        }
        const shareUrl = `${process.env.FRONTEND_URL}/post/${post._id}`;
        res.status(200).json({
            message: "Post share tracked successfully",
            shareUrl,
            shareCount: post.shareCount,
        });
    }
    catch (err) {
        console.error("Share Post Error:", err);
        res.status(500).json({ message: "Failed to share post", error: err });
    }
});
exports.sharePost = sharePost;
// Track Post View by admin
const trackPostView = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { postId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        res.status(401).json({ message: "User not authenticated" });
        return;
    }
    const objectUserId = new mongoose_1.default.Types.ObjectId(userId);
    try {
        const post = yield postModel_1.default.findById(postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        const alreadyViewed = post.views.some((view) => view.userId.toString() === objectUserId.toString());
        if (!alreadyViewed) {
            post.views.push({ userId: objectUserId, viewedAt: new Date() });
            post.viewCount += 1;
            yield post.save();
        }
        //Populate userId for analytics
        yield post.populate("views.userId", "name email photoURL");
        res.status(200).json({ message: "Post view tracked" });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to track post view", error: err });
    }
});
exports.trackPostView = trackPostView;
// Get Post Analytics
const getPostAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { postId } = req.params;
    const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!adminId) {
        res.status(400).json({ message: "Admin ID is required" });
        return;
    }
    try {
        const post = yield postModel_1.default.findById(postId)
            .populate("views.userId", "name email photoURL")
            .populate("likes", "name email photoURL")
            .populate("savedBy", "name email photoURL")
            .populate("sharedBy", "name email photoURL");
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        if (post.adminId.toString() !== adminId.toString()) {
            res.status(403).json({ message: "Unauthorized access" });
            return;
        }
        // Format viewDetails
        const viewDetails = post.views.map((view) => {
            const user = view.userId;
            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                photoURL: user.photoURL,
                viewedAt: view.viewedAt,
            };
        });
        //Format likedBy
        const likedBy = post.likes.map((user) => {
            const u = user;
            return {
                _id: u._id,
                name: u.name,
                email: u.email,
                photoURL: u.photoURL,
            };
        });
        //Format savedBy
        const savedBy = post.savedBy.map((user) => {
            const u = user;
            return {
                _id: u._id,
                name: u.name,
                email: u.email,
                photoURL: u.photoURL,
            };
        });
        // Format sharedBy
        const sharedBy = post.sharedBy.map((user) => {
            const u = user;
            return {
                _id: u._id,
                name: u.name,
                email: u.email,
                photoURL: u.photoURL,
            };
        });
        res.status(200).json({
            postId: post._id,
            likes: post.likes.length,
            saved: post.savedBy.length,
            shares: post.shareCount,
            views: post.viewCount,
            viewDetails,
            likedBy,
            savedBy,
            sharedBy,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch analytics", error: err });
    }
});
exports.getPostAnalytics = getPostAnalytics;
