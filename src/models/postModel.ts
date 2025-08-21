import mongoose, { Schema, Document, Types } from "mongoose";

export type PostType = "text" | "image" | "video" | "poll" |"mixed";

interface View {
  userId: Types.ObjectId | {
    _id: string;
    name: string;
    email: string;
    photoURL: string;
  };
  viewedAt: Date;
}

export interface IPost extends Document {
  adminId: Types.ObjectId;
  content?: string;
  images?: string[];
  video?: string;
  videoThumbnail?: string;
  postType: PostType;
  pollOptions?: {
    _id: Types.ObjectId;
    option: string; 
    votes: number ;
    voters: Types.ObjectId[]; //Added to track which users voted for this option
  }[];
  expiresAt?: Date;
  likes: Types.ObjectId[];
  savedBy: Types.ObjectId[];
  shareCount: number;
  sharedBy: Types.ObjectId[];
  category: string;

  // Analytics Fields
  views: View[];
  viewCount: number;

  createdAt?: Date;
  updatedAt?: Date;
}

const postSchema: Schema<IPost> = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String },
    images: [{ type: String }],
    video: { type: String },
     videoThumbnail: { type: String },
    postType: {
      type: String,
      enum: ["text", "image", "video", "poll","mixed"],
      required: true,
    },
    pollOptions: [
      {
        option: { type: String },
        votes: { type: Number, default: 0 },
        voters: [{ type: Schema.Types.ObjectId, ref: "User" }],
      },
      
    ],
    expiresAt: { type: Date },

    // Social Interactions
    likes: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    savedBy: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    shareCount: { type: Number, default: 0 },
    sharedBy: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],

    // View Tracking
    views: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    viewCount: { type: Number, default: 0 },

    category: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IPost>("Post", postSchema);
