import { Response } from "express";
import Notification from "../models/notificationModel";
import { AuthRequest } from "./authController";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

// Get grouped notifications (for admin & user)
export const getNotifications = (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;

  return Notification.find({ receiverId: userId })
    .sort({ createdAt: -1 })
    .populate("senderId", "name photoURL")
    .then(notifications => {
      const grouped: Record<string, any[]> = {};

      notifications.forEach(notification => {
        const createdAt = dayjs(notification.createdAt);
        const groupLabel = createdAt.isToday()
          ? "Today"
          : createdAt.isYesterday()
          ? "Yesterday"
          : createdAt.format("DD MMM YYYY");

        if (!grouped[groupLabel]) grouped[groupLabel] = [];

        const sender = notification.senderId as unknown as { _id: string; name: string; photoURL: string; };

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

      res.status(200).json({ status: true,  data: grouped  });
    })
    .catch(error => {
      console.error("Failed to fetch notifications:", error);
      res.status(500).json({ status: false,  message: "Failed to fetch notifications", data:{error:error   }   });
    });
};

// Mark a single notification as read (receiver only)
export const markAsRead = (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?._id;

  return Notification.findOne({ _id: id, receiverId: userId })
    .then(notification => {
      if (!notification) {
        res.status(404).json({ status: false,  message: "Notification not found"   });
        return;
      }

      notification.isRead = true;
      return notification.save().then(() => {
        res.status(200).json({ status: true,  message: "Notification marked as read"  });
      });
    })
    .catch(error => {
      console.error("Failed to mark as read:", error);
      res.status(500).json({ status: false,  message: "Failed to mark as read", data:{error:error   }   });
    });
};

// Mark all notifications as read
export const markAllAsRead = (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;

  if (!userId) {
    res.status(401).json({ status: false, message: "Unauthorized"   });
    return Promise.resolve();
  }

  return Notification.updateMany({ receiverId: userId, isRead: false }, { $set: { isRead: true } })
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
        data:{error:error},
      });
    });
};
