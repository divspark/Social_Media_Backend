import { Request, Response } from "express";
import Post from "../models/postModel";
import cloudinary from "../utils/cloudinary";
import mongoose from "mongoose";
import dayjs from "dayjs";
import { sendNotification, sendNotificationToMany } from "../utils/sendNotification";
import Notification from "../models/notificationModel";
import User, { IUser } from "../models/userModel";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

// Define default constants
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

interface AuthRequest extends Request {
  user?: IUser;
}

export const createPost = async (req: AuthRequest, res: Response): Promise<void> => {
  const { content, postType, pollOptions, category } = req.body;
  const adminId = req.user?._id;

  try {
    if (!category || typeof category !== "string") {
      res.status(400).json({ status: false, message: "Category is required"   });
      return;
    }

    let images: string[] = [];
    let video: string | undefined;
    let videoThumbnail: string | undefined;

    // Upload Images
    if (req.files && "images" in req.files) {
      const imageFiles = req.files["images"] as Express.Multer.File[];

      for (const file of imageFiles) {
        if (file.size > 15 * 1024 * 1024) {
          res.status(400).json({ status: false, message: "Each image must be under 15MB"   });
          return;
        }

        const imageUrl = await new Promise<string>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: "posts/images",
              format: "webp",
              quality: "auto:good",
            },
            (error, result) => {
              if (error || !result) {
                console.error("Image upload error:", error);
                reject("Image upload failed");
              } else {
                resolve(result.secure_url);
              }
            }
          );
          stream.end(file.buffer);
        });

        images.push(imageUrl);
      }
    }

    //  Upload Video (stream + async eager processing)
    if (req.files && "video" in req.files) {
      const videoFile = (req.files["video"] as Express.Multer.File[])[0];

      if (videoFile.size > 1024 * 1024 * 1024) {
        res.status(400).json({ status: false, message: "Video too large (max 1GB)"   });
        return;
      }

      video = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            folder: "posts/videos",
            eager: [{ format: "mp4", quality: "auto" }],
            eager_async: true,
          },
          (error, result) => {
            if (error || !result) {
              console.error("Cloudinary video upload error:", error);
              reject("Video upload failed");
            } else {
              resolve(result.secure_url);
            }
          }
        );
        stream.end(videoFile.buffer);
      });
    }

    //  Upload Video Thumbnail
    if (req.files && "videoThumbnail" in req.files) {
      const thumbnailFile = (req.files["videoThumbnail"] as Express.Multer.File[])[0];

      if (thumbnailFile.size > 5 * 1024 * 1024) {
        res.status(400).json({ status: false, message: "Thumbnail too large (max 5MB)"   });
        return;
      }

      videoThumbnail = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "image",
            folder: "posts/thumbnails",
            quality: "auto:eco",
            format: "webp",
          },
          (error, result) => {
            if (error || !result) {
              console.error("Thumbnail upload error:", error);
              reject("Thumbnail upload failed");
            } else {
              resolve(result.secure_url);
            }
          }
        );
        stream.end(thumbnailFile.buffer);
      });
    }

    //  Save Post
    const post = await Post.create({
      adminId,
      content,
      postType,
      images,
      video,
      videoThumbnail,
      category,
      pollOptions: postType === "poll" ? JSON.parse(pollOptions || "[]") : [],
    });

    const populatedPost = await post.populate("adminId", "_id name photoURL");
    const postObj = populatedPost.toObject();
    const admin = postObj.adminId as unknown as {
      _id: string;
      name: string;
      photoURL: string;
    };

    const users = await User.find({ _id: { $ne: adminId } }, "fcmToken");
    const allTokens: string[] = users
      .map(u => u.fcmToken?.trim())
      .filter((token): token is string => Boolean(token));

    await sendNotificationToMany(
      allTokens,
      "New Admin Post",
      `${admin.name} posted: ${content.slice(0, 50)}...`
    );

    await Notification.insertMany(
      users.map(u => ({
        senderId: adminId,
        receiverId: u._id,
        type: "admin-post",
        content: `${admin.name} posted: ${content.slice(0, 50)}...`,
        postId: post._id,
      }))
    );

    res.status(201).json({
      message: "Post created successfully",
      status: true,
      data:{
      category: category.toLowerCase(),
      data: {
        ...postObj,
        timeAgo: dayjs(post.createdAt).fromNow(),
        adminId: {
          _id: admin._id,
          name: admin.name,
          photoURL: admin.photoURL,
        },
      },
    }});
  } catch (err) {
    console.error("Create Post Error:", err);
    res.status(500).json({ status: false, message: "Failed to create post", data: { error: err }   });
  }
};



// Helper: calculate vote percentages
function getVotePercentages(options: any[]) {
  const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0);
  return options.map((opt) => ({
    optionId: opt._id,
    option: opt.option,
    votes: opt.votes,
    percentage: totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(2) + "%" : "0%",
  }));
}


export const votePollOption = async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id;
  const { postId, optionId } = req.body;

  // Validate IDs
  if (
    !mongoose.Types.ObjectId.isValid(postId) ||
    !mongoose.Types.ObjectId.isValid(optionId) ||
    !userId
  ) {
    res.status(400).json({ status: false,  message: "Invalid postId, optionId, or user not authenticated"   });
    return;
  }

  try {
    const post = await Post.findById(postId);

    if (!post || post.postType !== "poll") {
      res.status(404).json({ status: false, message: "Poll post not found"   });
      return;
    }

    // 🧹 Remove user's previous vote
    post.pollOptions?.forEach((opt: any) => {
      const index = opt.voters?.findIndex((v: any) => v.toString() === userId.toString());
      if (index !== -1) {
        opt.voters.splice(index, 1);
        opt.votes = Math.max(0, opt.votes - 1);
      }
    });

    //  Add vote to selected option
    const selectedOption = post.pollOptions?.find(
      (opt: any) => opt._id.toString() === optionId
    );

    if (!selectedOption) {
      res.status(404).json({ status: false,  message: "Poll option not found"   });
      return;
    }

    selectedOption.votes += 1;
    selectedOption.voters.push(new mongoose.Types.ObjectId(userId));

    await post.save();

    const result = getVotePercentages(post.pollOptions || []);

    res.status(200).json({
      message: "Vote cast successfully",
      status: true,
      data:{
      postId,
      votedOptionId: optionId,
      results: result,
   }});
  } catch (err) {
    res.status(500).json({ status: false,  message: "Voting failed", data: { error: err }   });
  }
};

export const getPostVotePollById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ status: false, message: "Invalid post ID"   });
    return;
  }

  try {
    const post = await Post.findById(id).populate("adminId", "name photoURL");

    if (!post) {
      res.status(404).json({ status: false, message: "Post not found"   });
      return;
    }

    const postObj = post.toObject();
    const timeAgo = dayjs(post.createdAt).fromNow();

    let pollResults;
    let userVotedOptionId;

    if (post.postType === "poll" && Array.isArray(post.pollOptions)) {
      // Check if user has voted
      for (const opt of post.pollOptions) {
        if (opt.voters?.some((v: any) => v.toString() === userId?.toString())) {
          userVotedOptionId = opt._id;
          break;
        }
      }

      if (userVotedOptionId) {
        pollResults = getVotePercentages(post.pollOptions);
      }
    }

    res.status(200).json({
      message: "Post fetched successfully",
      status: true,
      data:{
      ...postObj,
      timeAgo,
      pollResults: pollResults || null, // null if not voted
      userVotedOptionId: userVotedOptionId || null,
   }});
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to fetch post", data: { error: err }   });
  }
};

export const getAllPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get page and limit from query params or use defaults
    const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    // Fetch total count of posts
    const totalPosts = await Post.countDocuments();

    // Fetch posts with pagination
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("adminId", "_id name photoURL");

    // Format posts
    const formattedPosts = posts.map((post) => {
      const postObj = post.toObject();

      const admin = postObj.adminId as unknown as {
        _id: string;
        name: string;
        photoURL: string;
      };

      return {
        ...postObj,
        timeAgo: dayjs(post.createdAt).fromNow(),
        adminId: {
          _id: admin._id,
          name: admin.name,
          photoURL: admin.photoURL,
        },
        videoThumbnail: postObj.videoThumbnail || null,
      };
    });

    // Determine if there are more posts
    const hasMore = skip + posts.length < totalPosts;

    res.status(200).json({ 
      status: true,  
      message: "Posts fetched successfully",
      data: {
        data: formattedPosts,
        page,
        limit,
        hasMore
      } 
    });
  } catch (err) {
    res.status(500).json({ 
      status: false,  
      message: "Failed to fetch posts", 
      data: { error: err } 
    });
  }
};


export const getPostById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id).populate("adminId", "_id name photoURL");

    if (!post) {
      res.status(404).json({ status: false, message: "Post not found"   });
      return;
    }

    const postObj = post.toObject();

    const admin = postObj.adminId as unknown as {
      _id: string;
      name: string;
      photoURL: string;
    };

    const { category, ...cleanedPost } = postObj;

    res.status(200).json({
      message:"Post fetched successfully",
      status: true,
      data:{
      category: category?.toLowerCase() || null,
      data: {
        ...cleanedPost,
        timeAgo: dayjs(post.createdAt).fromNow(),
        adminId: {
          _id: admin._id,
          name: admin.name,
          photoURL: admin.photoURL,
        },
        videoThumbnail: postObj.videoThumbnail || null,
      },
   }});
  } catch (err) {
    res.status(500).json({ status: false,message: "Failed to fetch post", data: { error: err }   });
  }
};



export const getPostsByCategory = async (req: Request, res: Response): Promise<void> => {
  const { category } = req.params;

  // Get page and limit from query params or use defaults
  const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
  const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  try {
    // Count total posts for the category
    const totalPosts = await Post.countDocuments({
      category: { $regex: new RegExp("^" + category + "$", "i") }
    });

    // Fetch paginated posts
    const posts = await Post.find({
      category: { $regex: new RegExp("^" + category + "$", "i") }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("adminId", "_id name photoURL");

    // Format posts
    const formattedPosts = posts.map(post => {
      const postObj = post.toObject();

      const admin = postObj.adminId as unknown as {
        _id: string;
        name: string;
        photoURL: string;
      };

      return {
        ...postObj,
        timeAgo: dayjs(post.createdAt).fromNow(),
        adminId: {
          _id: admin._id,
          name: admin.name,
          photoURL: admin.photoURL,
        },
        videoThumbnail: postObj.videoThumbnail || null,
      };
    });

    // Determine if there are more posts
    const hasMore = skip + posts.length < totalPosts;

    res.status(200).json({
      message: "Posts fetched successfully",
      status: true,
      data: {
        category: category.toLowerCase(),
        page,
        limit,
        hasMore,
        data: formattedPosts,
      }
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Failed to fetch posts by category",
      data: { error: err }
    });
  }
};


// Update Post
export const updatePost = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const adminId = req.user?._id;
  const { content, postType, pollOptions, category } = req.body;

  try {
    const post = await Post.findOne({ _id: id, adminId });
    if (!post) {
      res.status(404).json({ status: false, message: "Post not found or unauthorized"   });
      return;
    }

    let images: string[] = post.images || [];
    let video: string | undefined = post.video;
    let videoThumbnail: string | undefined = post.videoThumbnail;

    // Upload new images
    if (req.files && "images" in req.files) {
      const imageFiles = req.files["images"] as Express.Multer.File[];
      images = [];

      for (const file of imageFiles) {
        const imageUrl = await new Promise<string>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: "posts/images",
            },
            (error, result) => {
              if (error || !result) reject("Image upload failed");
              else resolve(result.secure_url);
            }
          );
          stream.end(file.buffer);
        });

        images.push(imageUrl);
      }
    }

    // Upload new video
    if (req.files && "video" in req.files) {
      const videoFile = (req.files["video"] as Express.Multer.File[])[0];
      video = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            folder: "posts/videos",
          },
          (error, result) => {
            if (error || !result) reject("Video upload failed");
            else resolve(result.secure_url);
          }
        );
        stream.end(videoFile.buffer);
      });
    }

    // Upload new video thumbnail
    if (req.files && "videoThumbnail" in req.files) {
      const thumbnailFile = (req.files["videoThumbnail"] as Express.Multer.File[])[0];
      videoThumbnail = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "image",
            folder: "posts/video-thumbnails",
          },
          (error, result) => {
            if (error || !result) reject("Thumbnail upload failed");
            else resolve(result.secure_url);
          }
        );
        stream.end(thumbnailFile.buffer);
      });
    }

    // Update post fields
    post.content = content || post.content;
    post.postType = postType || post.postType;
    post.images = images;
    post.video = video;
    post.videoThumbnail = videoThumbnail;
    post.pollOptions = postType === "poll" ? JSON.parse(pollOptions || "[]") : post.pollOptions;

    if (category && typeof category === "string") {
      post.category = category;
    }

    await post.save();

    // Populate admin
    const populatedPost = await post.populate("adminId", "_id name photoURL");
    const postObj = populatedPost.toObject();

    const admin = postObj.adminId as unknown as {
      _id: string;
      name: string;
      photoURL: string;
    };

    // Remove `category` from response
    const { category: _omitCategory, ...cleanedPost } = postObj;

    res.status(200).json({
      message: "Post updated successfully",
      status: true,
      data:{
      category: post.category.toLowerCase(),
      data: {
        ...cleanedPost,
        timeAgo: dayjs(post.createdAt).fromNow(),
        adminId: {
          _id: admin._id,
          name: admin.name,
          photoURL: admin.photoURL,
        },
        videoThumbnail: post.videoThumbnail || null,
      },
    }});
  } catch (err) {
    console.error("Update Post Error:", err);
    res.status(500).json({ status: false, message: "Failed to update post", data: { error: err }   });
  }
};


export const deletePost = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const adminId = req.user?._id;

  try {
    const post = await Post.findOne({ _id: id, adminId });
    if (!post) {
      res.status(404).json({ status: false, message: "Post not found"   });
      return;
    }

    await Post.findByIdAndDelete(id);
    res.status(200).json({ status: true,  message: "Post deleted successfully"  });
  } catch (err) {
    res.status(500).json({ status: false,  message: "Delete failed", data: { error: err }   });
  }
};


// Like / Unlike Post
export const toggleLikePost = async (req: AuthRequest, res: Response): Promise<void> => {
  const { postId } = req.params;
  const userId = req.user?._id;
  const objectUserId = new mongoose.Types.ObjectId(userId);

  try {
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ status: false, message: "Post not found"   });
      return;
    }

    const isLiked = post.likes?.some((id) => id.equals(objectUserId));

    if (isLiked) {
      post.likes = post.likes.filter((id) => !id.equals(objectUserId));
    } else {
      post.likes.push(objectUserId);

      // Notify Admin
      const adminUser = await User.findById(post.adminId);
      if (adminUser?.fcmToken) {
        await sendNotification(
          adminUser.fcmToken,
          "New Like",
          `${req.user?.name} Someone liked your post`
        );
      }

      await Notification.create({
        senderId: userId,
        receiverId: post.adminId,
        type: "like",
        postId: post._id,
      });
    }

    await post.save();

    res.status(200).json({
      message: isLiked ? "Post unliked" : "Post liked",
      status: true,
      data: {
      likesCount: post.likes.length,
    }});
  } catch (err) {
    res.status(500).json({ status: false,  message: "Failed to toggle like", data: { error: err }   });
  }
};


// Save / Unsave Post
export const toggleSavePost = async (req: AuthRequest, res: Response): Promise<void> => {
  const { postId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    res.status(400).json({ status: false, message: "User ID is required"   });
    return;
  }

  const objectUserId = new mongoose.Types.ObjectId(userId);

  try {
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ status: false, message: "Post not found"   });
      return;
    }

    const isSaved = post.savedBy?.some((id) => id.equals(objectUserId));

    if (isSaved) {
      post.savedBy = post.savedBy.filter((id) => !id.equals(objectUserId));
    } else {
      post.savedBy.push(objectUserId);

      // Notify Admin (only when saved)
      const adminUser = await User.findById(post.adminId);
      if (adminUser?.fcmToken) {
        await sendNotification(
          adminUser.fcmToken,
          "Post Saved",
          `${req.user?.name} Someone saved your post`
        );
      }

      await Notification.create({
        senderId: userId,
        receiverId: post.adminId,
        type: "save",
        postId: post._id,
      });
    }

    await post.save();
    res.status(200).json({
      message: isSaved ? "Post unsaved" : "Post saved",
      status: true,
      data: post.savedBy.length,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to toggle save", data: { error: err }   });
  }
};

// Get All Saved Posts (by User)
export const getSavedPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?._id;

  try {
    const posts = await Post.find({ savedBy: userId })
      .sort({ createdAt: -1 })
      .populate("adminId", "name photoURL");

    res.status(200).json({ status: true,message:"Fetched Post Successfully",  data: posts  });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to fetch saved posts", data: { error: err }   });
  }
};



// Share Post (tracks shareCount & sharedBy for analytics)
export const sharePost = async (req: AuthRequest, res: Response): Promise<void> => {
  const { postId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    res.status(400).json({ status: false,message: "User ID is required"   });
    return;
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ status: false, message: "Post not found"   });
      return;
    }

    const alreadyShared = post.sharedBy?.some(
      (id) => id.toString() === userId.toString()
    );

    if (!alreadyShared) {
      post.sharedBy.push(new mongoose.Types.ObjectId(userId));
      post.shareCount += 1;
      await post.save();
    }

    const shareUrl = `${process.env.FRONTEND_URL}/post/${post._id}`;

    res.status(200).json({
      message: "Post share tracked successfully",
      status: true,
      data:{
      shareUrl,
      shareCount: post.shareCount,
    }});
  } catch (err) {
    console.error("Share Post Error:", err);
    res.status(500).json({ status: false, message: "Failed to share post", data: { error: err }   });
  }
};

// Track Post View by admin
export const trackPostView = async (req: AuthRequest, res: Response): Promise<void> => {
  const { postId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    res.status(401).json({ status: false, message: "User not authenticated"   });
    return;
  }

  const objectUserId = new mongoose.Types.ObjectId(userId);

  try {
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ status: false,message: "Post not found"   });
      return;
    }

    const alreadyViewed = post.views.some(
      (view) => view.userId.toString() === objectUserId.toString()
    );

    if (!alreadyViewed) {
      post.views.push({ userId: objectUserId, viewedAt: new Date() });
      post.viewCount += 1;
      await post.save();
    }

    //Populate userId for analytics
    await post.populate("views.userId", "name email photoURL");

    res.status(200).json({ status: true,  message: "Post view tracked"  });
  } catch (err) {
    res.status(500).json({ status: false,  message: "Failed to track post view", data: { error: err }   });
  }
};




// Get Post Analytics
export const getPostAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  const { postId } = req.params;
  const adminId = req.user?._id;

  if (!adminId) {
    res.status(400).json({ status: false, message: "Admin ID is required"   });
    return;
  }

  try {
    const post = await Post.findById(postId)
      .populate("views.userId", "name email photoURL")
      .populate("likes", "name email photoURL")
      .populate("savedBy", "name email photoURL")
      .populate("sharedBy", "name email photoURL");

    if (!post) {
      res.status(404).json({ status: false, message: "Post not found"   });
      return;
    }

    if (post.adminId.toString() !== adminId.toString()) {
      res.status(403).json({ status: false,  message: "Access denied. Only the post owner can view analytics."   });
      return;
    }

    // Format viewDetails
    const viewDetails = post.views.map((view) => {
      const user = view.userId as unknown as {
        _id: string;
        name: string;
        email: string;
        photoURL: string;
      };

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        viewedAt: view.viewedAt,
      };
    });

    //Format likedBy
    const likedBy = post.likes.map((user) => {
      const u = user as unknown as {
        _id: string;
        name: string;
        email: string;
        photoURL: string;
      };

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        photoURL: u.photoURL,
      };
    });

    //Format savedBy
    const savedBy = post.savedBy.map((user) => {
      const u = user as unknown as {
        _id: string;
        name: string;
        email: string;
        photoURL: string;
      };

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        photoURL: u.photoURL,
      };
    });

    // Format sharedBy
    const sharedBy = post.sharedBy.map((user) => {
      const u = user as unknown as {
        _id: string;
        name: string;
        email: string;
        photoURL: string;
      };

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        photoURL: u.photoURL,
      };
    });

    res.status(200).json({
      message: "Post analytics fetched successfully",
      status: true,
      data:{
      postId: post._id,
      likes: post.likes.length,
      saved: post.savedBy.length,
      shares: post.shareCount,
      views: post.viewCount,
      viewDetails,
      likedBy,
      savedBy,
      sharedBy,
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: "Failed to fetch analytics", data: { error: err }   });
  }
};

