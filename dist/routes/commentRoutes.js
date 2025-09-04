"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const commentController_1 = require("../controllers/commentController");
const middlewares_1 = require("../middlewares");
const router = express_1.default.Router();
router.post("/addComment", (0, middlewares_1.checkFeatureAccess)("comment"), commentController_1.addComment);
router.post("/replyComment/:commentId/reply", (0, middlewares_1.checkFeatureAccess)("comment"), commentController_1.replyToComment);
router.delete("/delete/:commentId", commentController_1.deleteComment);
router.get("/getpostComment/:postId", commentController_1.getCommentsByPost);
router.post("/:commentId/like", (0, middlewares_1.checkFeatureAccess)("like"), commentController_1.toggleLikeComment);
exports.default = router;
