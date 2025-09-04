"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const postController_1 = require("../controllers/postController");
const middlewares_1 = require("../middlewares");
const router = express_1.default.Router();
// -------------------- Admin Post Management --------------------
// Create Post (Admin)
router.post("/createPost", middlewares_1.requireAdmin, middlewares_1.upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
    { name: "videoThumbnail", maxCount: 1 },
]), postController_1.createPost);
// Update Post (Admin)
router.put("/updatePost/:id", middlewares_1.requireAdmin, middlewares_1.upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
    { name: "videoThumbnail", maxCount: 1 },
]), postController_1.updatePost);
// Delete Post (Admin)
router.delete("/deletePost/:id", middlewares_1.requireAdmin, postController_1.deletePost);
// Post Analytics (Admin)
router.get("/analytics/:postId", middlewares_1.requireAdmin, postController_1.getPostAnalytics);
// -------------------- Public / User Routes --------------------
// Get All Posts
router.get("/getAllPost", middlewares_1.checkBlockedUser, postController_1.getAllPosts);
// Get Post by ID
router.get("/getPostById/:id", middlewares_1.checkBlockedUser, postController_1.getPostById);
// Get Posts by Category
router.get("/category/:category", middlewares_1.checkBlockedUser, postController_1.getPostsByCategory);
// Like / Unlike Post
router.post("/:postId/like", middlewares_1.checkBlockedUser, (0, middlewares_1.checkFeatureAccess)("like"), postController_1.toggleLikePost);
// Save / Unsave Post
router.post("/:postId/save", middlewares_1.checkBlockedUser, (0, middlewares_1.checkFeatureAccess)("save"), postController_1.toggleSavePost);
// Get All Saved Posts
router.get("/saved", middlewares_1.checkBlockedUser, postController_1.getSavedPosts);
// Share Post
router.post("/:postId/share", middlewares_1.checkBlockedUser, (0, middlewares_1.checkFeatureAccess)("share"), postController_1.sharePost);
// Track View
router.get("/trackView/:postId", middlewares_1.checkBlockedUser, postController_1.trackPostView);
// -------------------- Poll Voting --------------------
// Vote on a Poll Option (User/Admin)
router.post("/vote", middlewares_1.checkBlockedUser, (0, middlewares_1.checkFeatureAccess)("post"), postController_1.votePollOption);
// Get Poll Vote Result by Post ID (Only shows results if user voted)
router.get("/voteResult/:id", middlewares_1.checkBlockedUser, postController_1.getPostVotePollById);
exports.default = router;
