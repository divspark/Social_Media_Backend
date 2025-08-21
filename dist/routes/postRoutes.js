"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const postController_1 = require("../controllers/postController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = require("../middlewares/multer");
const checkBlockedUser_1 = require("../middlewares/checkBlockedUser");
const checkFeatureRestriction_1 = require("../middlewares/checkFeatureRestriction");
const router = express_1.default.Router();
// -------------------- Admin Post Management --------------------
// Create Post (Admin)
router.post("/createPost", authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireAdmin, multer_1.upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
    { name: "videoThumbnail", maxCount: 1 },
]), postController_1.createPost);
// Update Post (Admin)
router.put("/updatePost/:id", authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireAdmin, multer_1.upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
    { name: "videoThumbnail", maxCount: 1 },
]), postController_1.updatePost);
// Delete Post (Admin)
router.delete("/deletePost/:id", authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireAdmin, postController_1.deletePost);
// Post Analytics (Admin)
router.get("/analytics/:postId", authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireAdmin, postController_1.getPostAnalytics);
// -------------------- Public / User Routes --------------------
// Get All Posts
router.get("/getAllPost", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, postController_1.getAllPosts);
// Get Post by ID
router.get("/getPostById/:id", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, postController_1.getPostById);
// Get Posts by Category
router.get("/category/:category", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, postController_1.getPostsByCategory);
// Like / Unlike Post
router.post("/:postId/like", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, (0, checkFeatureRestriction_1.checkFeatureAccess)("like"), postController_1.toggleLikePost);
// Save / Unsave Post
router.post("/:postId/save", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, (0, checkFeatureRestriction_1.checkFeatureAccess)("save"), postController_1.toggleSavePost);
// Get All Saved Posts
router.get("/saved", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, postController_1.getSavedPosts);
// Share Post
router.post("/:postId/share", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, (0, checkFeatureRestriction_1.checkFeatureAccess)("share"), postController_1.sharePost);
// Track View
router.get("/trackView/:postId", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, postController_1.trackPostView);
// -------------------- Poll Voting --------------------
// Vote on a Poll Option (User/Admin)
router.post("/vote", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, (0, checkFeatureRestriction_1.checkFeatureAccess)("post"), postController_1.votePollOption);
// Get Poll Vote Result by Post ID (Only shows results if user voted)
router.get("/voteResult/:id", authMiddleware_1.verifyFirebaseToken, checkBlockedUser_1.checkBlockedUser, postController_1.getPostVotePollById);
exports.default = router;
