import { Request, Response } from "express";
import mongoose from "mongoose";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Comment from "../models/commentModel";
import User, { IUser } from "../models/userModel";
import Post from "../models/postModel";
import Notification from "../models/notificationModel";
import { sendNotification } from "../utils/sendNotification";
import { messaging } from "firebase-admin";
import { stat } from "fs";

dayjs.extend(relativeTime);

//Extend Request with Auth Info
interface AuthRequest extends Request {
  user?: IUser;
}

//Add a Comment (Only once per post per user)
export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { postId, content } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    res.status(401).json({ status: false,  message: "Unauthorized"   });
    return;
  }

  try {
    // const existingComment = await Comment.findOne({ postId, userId });
    // if (existingComment) {
    //   res.status(400).json({ status: false,  message: "You have already commented on this post."   });
    //   return;
    // }

    const comment = await Comment.create({ postId, userId, content });
    const populated = await comment.populate("userId", "name photoURL");

    // Notify Post Admin
    const post = await Post.findById(postId);
    if (post) {
      const admin = await User.findById(post.adminId);
      if (admin?.fcmToken) {
        await sendNotification(admin.fcmToken, "New Comment", "Someone commented on your post");
      }

      await Notification.create({
        senderId: userId,
        receiverId: post.adminId,
        type: "comment",
        postId: post._id,
      });
    }

    res.status(201).json({
      message: "Comment added successfully",
      status: true,
      data: {
    ...populated.toObject(),
    timeAgo: dayjs(comment.createdAt).fromNow(),
  }});
  } catch (error) {
    console.error("Add Comment Error:", error);
    res.status(500).json({ status: false,  message: "Failed to add comment",data:{ error:error}   });
  }
};

// Admin Reply to a Comment (Only once)
export const replyToComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { commentId } = req.params;
  const { content } = req.body;
  const adminId = req.user?._id;

  if (!adminId || req.user?.role !== "admin") {
    res.status(403).json({ status: false,  message: "Only admin can reply to comments"   });
    return;
  }

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404).json({ status: false,  message: "Comment not found"   });
      return;
    }

    if (comment.reply?.content) {
      res.status(400).json({ status: false,  message: "This comment already has a reply."   });
      return;
    }

    comment.reply = {
      content,
      adminId: new mongoose.Types.ObjectId(adminId),
      createdAt: new Date(),
    };
    await comment.save();

    // Notify User
    const user = await User.findById(comment.userId);
    if (user?.fcmToken) {
      await sendNotification(user.fcmToken, "Admin Replied", "Admin replied to your comment");
    }

    await Notification.create({
      senderId: adminId,
      receiverId: comment.userId,
      type: "reply",
      postId: comment.postId,
    });

    const updated = await Comment.findById(commentId).populate("reply.adminId", "name photoURL");

    res.status(200).json({
      message: "Reply added successfully",
      status: true,
      data: updated,
    });
  } catch (error) {
    console.error("Reply Error:", error);
    res.status(500).json({ status: false,  message: "Failed to reply to comment", data:{ error:error}   });
  }
};

// Delete a Comment (User or Admin)
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { commentId } = req.params;
  const currentUser = req.user;

  if (!currentUser) {
    res.status(401).json({ status: false,  message: "Unauthorized"   });
    return;
  }

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404).json({ status: false,  message: "Comment not found"   });
      return;
    }

    const isOwner = comment.userId.toString() === currentUser._id.toString();
    const isAdmin = currentUser.role === "admin";

    if (isAdmin || isOwner) {
      await Comment.findByIdAndDelete(commentId);
      res.status(200).json({ status: true,  message: "Comment deleted successfully"  });
    } else {
      res.status(403).json({ status: false, message: "Unauthorized to delete this comment"   });
    }
  } catch (error) {
    console.error("Delete Comment Error:", error);
    res.status(500).json({ status: false, message: "Failed to delete comment", data:{ error:error}   });
  }
};

// Get Paginated Comments
export const getCommentsByPost = async (req: Request, res: Response): Promise<void> => {
  const { postId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const total = await Comment.countDocuments({ postId });

    const comments = await Comment.find({ postId })
      .populate("userId", "name photoURL")
      .populate("reply.adminId", "name photoURL")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formatted = comments.map((comment) => {
      const c = comment.toObject();
      return {
        ...c,
        timeAgo: dayjs(comment.createdAt).fromNow(),
        reply: c.reply?.content
          ? {
              ...c.reply,
              timeAgo: dayjs(c.reply.createdAt).fromNow(),
            }
          : null,
      };
    });

    res.status(200).json({
      message: "Comments fetched successfully",
      status: true,
      data:{
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: formatted,
   }});
  } catch (error) {
    console.error("Get Comments Error:", error);
    res.status(500).json({ status: false, message: "Failed to fetch comments", data:{ error:error}   });
  }
};

// Like / Unlike Comment
export const toggleLikeComment = async (req: Request, res: Response): Promise<void> => {
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    res.status(400).json({ status: false,message: "User ID is required"   });
    return;
  }

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404).json({ status: false,  message: "Comment not found"   });
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const alreadyLiked = comment.likes.some(
      (id) => id.toString() === userObjectId.toString()
    );

    if (alreadyLiked) {
      comment.likes = comment.likes.filter(
        (id) => id.toString() !== userObjectId.toString()
      );
    } else {
      comment.likes.push(userObjectId);

      // Notify comment owner
      const commentOwner = await User.findById(comment.userId);
      if (commentOwner && commentOwner.fcmToken) {
        await sendNotification(
          commentOwner.fcmToken,
          "New Like",
          "Someone liked your comment"
        );
      }

      await Notification.create({
        senderId: userObjectId,
        receiverId: comment.userId,
        type: "like-comment",
        postId: comment.postId,
      });
    }

    await comment.save();

   res.status(200).json({
      message: alreadyLiked ? "Comment unliked" : "Comment liked",
      status: true,
      data: comment.likes.length,
    });

  } catch (error) {
    console.error("Toggle Like Error:", error);
    res.status(500).json({ status: false, message: "Failed to like/unlike comment", data:{ error:error}   });
  }
};
