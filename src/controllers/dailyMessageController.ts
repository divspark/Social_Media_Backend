import { Request, Response } from "express";
import DailyMessage from "../models/dailyMessageModel";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import User, { IUser } from "../models/userModel";

dayjs.extend(relativeTime);

interface AuthRequest extends Request {
  user?: IUser;
}

// Create
export const createDailyMessage = async (req: AuthRequest, res: Response) => {
  const adminId = req.user?._id;
  const { content } = req.body;

  try {
    const newMessage = await DailyMessage.create({ adminId, content });

    const admin = await User.findById(adminId).select("name photoURL");

    res.status(201).json({
      message: "Daily message created",
      status: "success",
      data:{
      post: {
        _id: newMessage._id,
        content: newMessage.content,
        postedBy: admin,
        date: dayjs(newMessage.createdAt).format("MMMM D, YYYY"),
        timeAgo: dayjs(newMessage.createdAt).fromNow(),
      },
   }});
  } catch (err) {
    res.status(500).json({ status: "failed", message: "Failed to create daily message", data: { error: err }   });
  }
};

// Get All
export const getAllDailyMessages = async (_req: Request, res: Response) => {
  try {
    const messages = await DailyMessage.find()
      .sort({ createdAt: -1 })
      .populate("adminId", "name photoURL");

    if (!messages || messages.length === 0) {
      res.status(404).json({ status: "failed", message: "No daily messages found"   });
      return;
    }

    res.status(200).json(
      messages.map(msg => ({
        _id: msg._id,
        content: msg.content,
        postedBy: msg.adminId,
        date: dayjs(msg.createdAt).format("MMMM D, YYYY"),
        timeAgo: dayjs(msg.createdAt).fromNow(),
      }))
    );
  } catch (err) {
    res.status(500).json({ status: "failed", message: "Failed to fetch daily messages", data: { error: err }   });
  }
};


//  Get by ID
export const getDailyMessageById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const message = await DailyMessage.findById(id).populate("adminId", "name photoURL");

    if (!message) {
      res.status(404).json({ status: "failed", message: "Daily message not found"   });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Daily message fetched",
      data:{
      _id: message._id,
      content: message.content,
      postedBy: message.adminId,
      date: dayjs(message.createdAt).format("MMMM D, YYYY"),
      timeAgo: dayjs(message.createdAt).fromNow(),
   }});
  } catch (error) {
    res.status(500).json({ status: "failed",message: "Failed to fetch daily message by ID", error   });
  }
};

//  Update
export const updateDailyMessage = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;

  if (req.user?.role !== "admin") {
    res.status(403).json({ status: "failed", message: "Only admin can update daily messages"   });
    return;
  }

  try {
    const message = await DailyMessage.findByIdAndUpdate(id, { content }, { new: true }).populate("adminId", "name photoURL");

    if (!message) {
      res.status(404).json({ status: "failed", message: "Daily message not found"   });
      return;
    }

    res.status(200).json({
      message: "Message updated",
      status: "success",
      data:{
      post: {
        _id: message._id,
        content: message.content,
        postedBy: message.adminId,
        date: dayjs(message.createdAt).format("MMMM D, YYYY"),
        timeAgo: dayjs(message.createdAt).fromNow(),
      },
   }});
  } catch (error) {
    res.status(500).json({ status: "failed", message: "Update failed", error   });
  }
};

//  Delete
export const deleteDailyMessage = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (req.user?.role !== "admin") {
    res.status(403).json({ status: "failed", message: "Only admin can delete daily messages"   });
    return;
  }

  try {
    const message = await DailyMessage.findByIdAndDelete(id);

    if (!message) {
      res.status(404).json({ status: "failed",  message: "Message not found"   });
      return;
    }

    res.status(200).json({ status: "success",  message: "Message deleted successfully"  });
  } catch (error) {
    res.status(500).json({ status: "failed", message: "Delete failed", error   });
  }
};
