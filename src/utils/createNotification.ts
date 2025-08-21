import Notification from "../models/notificationModel";

interface CreateNotificationParams {
  senderId: string;
  receiverId: string;
  postId?: string;
  commentId?: string;
  type: "like" | "comment" | "reply" | "like-comment";
}

export const createNotification = (params: CreateNotificationParams): Promise<void> => {
  const { senderId, receiverId, postId, commentId, type } = params;

  // Optional: don't create notification if sender = receiver
  if (senderId === receiverId) return Promise.resolve();

  const notification = new Notification({
    senderId,
    receiverId,
    postId,
    commentId,
    type,
    isRead: false,
  });

  return notification.save()
    .then(() => console.log(`Notification created: ${type} from ${senderId} to ${receiverId}`))
    .catch(err => console.error("Failed to create notification:", err));
};
