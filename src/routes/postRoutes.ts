import express from "express";
import {
  createPost,
  updatePost,
  deletePost,
  getAllPosts,
  getPostById,
  toggleSavePost,
  getSavedPosts,
  toggleLikePost,
  sharePost,
  trackPostView,
  getPostAnalytics,
  getPostsByCategory,
  votePollOption,
  getPostVotePollById,
} from "../controllers/postController";

import { requireAdmin,checkBlockedUser,checkFeatureAccess,upload } from "../middlewares";

const router = express.Router();


// -------------------- Admin Post Management --------------------

// Create Post (Admin)
router.post("/createPost",requireAdmin,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
     { name: "videoThumbnail", maxCount: 1 },
  ]),
  createPost
);

// Update Post (Admin)
router.put("/updatePost/:id",requireAdmin,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
     { name: "videoThumbnail", maxCount: 1 },
  ]),
  updatePost
);

// Delete Post (Admin)
router.delete("/deletePost/:id",requireAdmin,deletePost);

// Post Analytics (Admin)
router.get("/analytics/:postId",requireAdmin,getPostAnalytics);


// -------------------- Public / User Routes --------------------

// Get All Posts
router.get("/getAllPost",checkBlockedUser,getAllPosts);

// Get Post by ID
router.get("/getPostById/:id",checkBlockedUser, getPostById);

// Get Posts by Category
router.get("/category/:category",checkBlockedUser, getPostsByCategory);

// Like / Unlike Post
router.post("/:postId/like",checkBlockedUser,checkFeatureAccess("like"),toggleLikePost);

// Save / Unsave Post
router.post("/:postId/save",checkBlockedUser,checkFeatureAccess("save"),toggleSavePost);

// Get All Saved Posts
router.get("/saved",checkBlockedUser, getSavedPosts);

// Share Post
router.post("/:postId/share",checkBlockedUser,checkFeatureAccess("share"),sharePost);

// Track View
router.get("/trackView/:postId",checkBlockedUser, trackPostView);


// -------------------- Poll Voting --------------------

// Vote on a Poll Option (User/Admin)
router.post("/vote",checkBlockedUser, checkFeatureAccess("post"),votePollOption);

// Get Poll Vote Result by Post ID (Only shows results if user voted)
router.get("/voteResult/:id",checkBlockedUser, getPostVotePollById);


export default router;
