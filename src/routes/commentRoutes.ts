import express from "express";
import {
  addComment,
  replyToComment,
  deleteComment,
  getCommentsByPost,
  toggleLikeComment,
} from "../controllers/commentController";
import { checkFeatureAccess } from "../middlewares";

const router = express.Router();

router.post("/addComment", checkFeatureAccess("comment"),addComment);
router.post("/replyComment/:commentId/reply",checkFeatureAccess("comment"),replyToComment);
router.delete("/delete/:commentId", deleteComment);
router.get("/getpostComment/:postId", getCommentsByPost);
router.post("/:commentId/like", checkFeatureAccess("like"),toggleLikeComment);


export default router;
