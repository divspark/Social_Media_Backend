import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  postId?: mongoose.Types.ObjectId;
  commentId?: mongoose.Types.ObjectId;
  type: "like" | "comment" | "reply" | "like-comment" | "save";
  isRead: boolean;
  createdAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    postId: { type: Schema.Types.ObjectId, ref: "Post" },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    type: {
      type: String,
      enum: ["like", "comment", "reply", "like-comment", "save"],
      required: true,
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>("Notification", notificationSchema);
