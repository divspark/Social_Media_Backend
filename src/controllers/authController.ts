import { Request, Response } from "express";
import admin from "../config/firebase";
import User, { IUser } from "../models/userModel";
import { uploadProfileImage } from "../services/cloudinaryService";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: IUser;
  file?: Express.Multer.File;
}

export const JWT_SECRET = process.env.JWT_SECRET || "secret";

// GOOGLE LOGIN
export const googleLoginOrCreate = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400).json({
      status: false,
      message: "idToken is required",
      data: {}
    });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name } = decoded;

    let user = await User.findOne({ uid });

    if (!user) {
      user = await User.create({
        name,
        email,
        uid,
        role: "pending",
      });
    }

    const payload = { id: user._id, uid: user.uid, email: user.email, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { noTimestamp: true });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    });

    res.status(user.role === "pending" ? 201 : 200).json({
      status: true,
      message:
        user.role === "pending"
          ? "New Google user created, please complete profile"
          : `${user.role} Google login successful`,
      data: {
        user,
        token,
        type: "google",
      },
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(401).json({
      status: false,
      message: "Invalid token",
      data: { data: { error: err } },
    });
  }
};

// PHONE LOGIN or CREATE
export const phoneLoginOrCreate = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400).json({ status: "failed",  message: "idToken is required"   });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid } = decoded;

    let user = await User.findOne({ uid });

    if (!user) {
      user = await User.create({
        uid,
        role: "pending"
      });
      res.status(201).json({ message: "New phone user created, please complete profile",status: "Success",data:{user, idToken} });
      return;
    }
    const data = {idToken,user}
    res.status(200).json({ message: `${user.role} phone login successful`, data,status: "Success" });
  } catch (err) {
    console.error("Phone login error:", err);
    res.status(401).json({ message: "Invalid token",status:"Failed", data: { data: { error: err } } });
  }
};

// COMPLETE PROFILE (Second Form)
export const completeProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, address } = req.body;
  const userId = req.user?._id;

  try {
    if (!userId) {
      res.status(400).json({ status: "failed",  message: "Invalid user ID"   });
      return;
    }


    let photoURL: string | undefined;

    if (req.file?.buffer) {
      photoURL = await uploadProfileImage(req.file.buffer, "profile_pics");
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name,
        email,
        address,
        role:"user",
        ...(photoURL && { photoURL }),
      },
      { new: true }
    );

    res.status(200).json({ status: "success",  message: "Profile completed",data:{ user: updatedUser } });
  } catch (err) {
    res.status(500).json({ status: "failed",  message: "Profile completion failed", data: { error: err }   });
  }
};


// GET OWN PROFILE
export const getOwnProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({ status: "failed",  message: "User not found"   });
      return;
    }

    res.status(200).json({ status: "success",message:"Profile Fetched Successfully", data:{ user  }});
  } catch (err) {
    res.status(500).json({ status: "failed",  message: "Failed to fetch profile", data: { error: err }   });
  }
};

// UPDATE OWN PROFILE (Edit Later)
export const updateOwnProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, address } = req.body;
  const userId = req.user?._id;

  try {
    let photoURL: string | undefined;

    if (req.file?.buffer) {
      photoURL = await uploadProfileImage(req.file.buffer, "profile_pics");
    }

    const updateFields: any = {
      ...(name && { name }),
      ...(email && { email }),
      ...(address && { address }),
      ...(photoURL && { photoURL }),
    };

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true });

    res.status(200).json({ status: "success",  message: "Profile updated", data:{user: updatedUser  }});
  } catch (err) {
    res.status(500).json({ status: "failed",  message: "Update failed", data: { error: err }   });
  }
};

// GET PROFILE BY UID (USER <-> ADMIN)
export const getUserProfileByUID = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ uid: req.params.uid });

    if (!user) {
      res.status(404).json({ status: "failed",  message: "User not found"   });
      return;
    }

    res.status(200).json({ status: "success",message:"User fetched successfully", data:{ user } });
  } catch (err) {
    res.status(500).json({ status: "failed",  message: "Failed to fetch user", data: { error: err }   });
  }
};


// Save FCM Token Controller
export const saveFcmToken = async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id;
  const { fcmToken } = req.body;

  if (!fcmToken) {
    res.status(400).json({ status: "failed",  message: "FCM token is required"   });
    return;
  }

  await User.findByIdAndUpdate(userId, { fcmToken });
  res.status(200).json({ status: "success",  message: "FCM token saved"  });
};


// Block or Unblock User (with optional duration in days)
export const blockOrUnblockUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId, block, reason, durationInDays } = req.body;

  if (!userId || typeof block !== "boolean") {
    res.status(400).json({ status: "failed",  message: "userId and block (true/false) are required"   });
    return;
  }

  try {
    const updateFields: any = {
      isBlocked: block,
      blockReason: block ? reason || "" : "",
      blockedUntil: block && durationInDays
        ? new Date(Date.now() + durationInDays * 24 * 60 * 60 * 1000)
        : null,
    };

    const updatedUserDoc = await User.findByIdAndUpdate(userId, updateFields, { new: true });

    if (!updatedUserDoc) {
      res.status(404).json({ status: "failed",  message: "User not found"   });
      return;
    }

    const user = updatedUserDoc.toObject();
    delete user.restrictions;

    res.status(200).json({
      message: block
        ? `User blocked ${durationInDays ? `for ${durationInDays} day(s)` : "permanently"}`
        : "User unblocked",
        status: "success",
      data:{
      user,
    }});
  } catch (err) {
    res.status(500).json({ status: "failed",  message: "Failed to update user block status", data: { error: err }   });
  }
};


// Get All Blocked Users
export const getBlockedUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({ isBlocked: true }).select(
      "name email role blockedUntil blockReason"
    );

    const formattedUsers = users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      blockReason: user.blockReason,
      blockedUntil: user.blockedUntil ? user.blockedUntil : "Permanent",
    }));

    res.status(200).json({ status: "success",message:"Blocked user fetched successfully", data:{ blockedUsers: formattedUsers } });
  } catch (err) {
    res.status(500).json({ status: "failed",  message: "Failed to fetch blocked users", data: { error: err }   });
  }
};

//  Set/Update Restrictions on a User
export const setUserRestrictions = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId, restrictions } = req.body;

  if (!userId || typeof restrictions !== "object") {
    res.status(400).json({ status: "failed",  message: "userId and restrictions are required"   });
    return;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { restrictions },
      { new: true }
    ).select("-restrictions"); // remove from response if you want

    res.status(200).json({ status: "success",  message: "User restrictions updated",data:{ user: updatedUser  }});
  } catch (err) {
    res.status(500).json({ status: "failed",  message: "Failed to update restrictions", data: { error: err }   });
  }
};

export const getRestrictedUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({
      $or: [
        { "restrictions.like": true },
        { "restrictions.comment": true },
        { "restrictions.save": true },
        { "restrictions.share": true },
        { "restrictions.post": true },
        { "restrictions.profileUpdate": true },
      ],
    }).select("name email role restrictions");

    res.status(200).json({ status: "success",message:"Restricted Users fetched successfully",  data:{restrictedUsers: users } });
  } catch (err) {
    res.status(500).json({ status: "failed",  message: "Failed to fetch restricted users", data: { error: err }   });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { role } = req.body;

  try {
    // Allow only admins to change role
    if (req.user?.role !== "admin") {
      res.status(403).json({ status: "failed",  message: "Forbidden: Only admins can change roles"   });
      return;
    }

    // Validate role
    if (!role || !["user", "admin"].includes(role)) {
      res.status(400).json({ status: "failed",  message: "Invalid role. Must be 'user' or 'admin'."   });
      return;
    }

    // Update role
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404).json({ status: "failed",  message: "User not found"   });
      return;
    }

    res.status(200).json({
      message: "User role updated successfully",
      status: "success",
      data:{
      user: updatedUser,
    }});
  } catch (err) {
    res.status(500).json({ status: "failed",  message: "Failed to update user role", data: { error: err }   });
  }
};