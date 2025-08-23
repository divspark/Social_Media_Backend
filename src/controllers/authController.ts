import { Request, Response } from "express";
import admin from "../config/firebase";
import User from "../models/userModel";
import { uploadProfileImage } from "../services/cloudinaryService";

export interface AuthRequest extends Request {
  user?: { _id: string };
  file?: Express.Multer.File;
}

// login with google
// GOOGLE LOGIN
export const googleLoginOrCreate = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400).json({ message: "idToken is required" });
    return;
  }

  try {
    // Verify Google ID Token with Firebase Admin SDK
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid } = decoded;

    // Check if user already exists in MongoDB
    let user = await User.findOne({ uid });

    if (!user) {
      // Create new user if not exists
      user = await User.create({
        uid,
        role: "pending", // Default role
      });

      res.status(201).json({
        message: "New Google user created, please complete profile",
        user,
        idToken,
      });
      return;
    }

    res.status(200).json({
      message: `${user.role} Google login successful`,
      user,
      idToken,
      type:"google",
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(401).json({ message: "Invalid token", error: err });
  }
};

// PHONE LOGIN or CREATE
export const phoneLoginOrCreate = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400).json({ message: "idToken is required" });
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
      res.status(201).json({ message: "New phone user created, please complete profile", user, idToken });
      return;
    }

    res.status(200).json({ message: `${user.role} phone login successful`, user, idToken });
  } catch (err) {
    console.error("Phone login error:", err);
    res.status(401).json({ message: "Invalid token", error: err });
  }
};

// COMPLETE PROFILE (Second Form)
export const completeProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, address, role } = req.body;
  const userId = req.user?._id;

  try {
    if (!userId) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    if (!["user", "admin"].includes(role)) {
      res.status(400).json({ message: "Invalid role. Must be 'user' or 'admin'" });
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
        role,
        ...(photoURL && { photoURL }),
      },
      { new: true }
    );

    res.status(200).json({ message: "Profile completed", user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Profile completion failed", error: err });
  }
};


// GET OWN PROFILE
export const getOwnProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile", error: err });
  }
};

// UPDATE OWN PROFILE (Edit Later)
export const updateOwnProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, address, role } = req.body;
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

    if (role && ["user", "admin"].includes(role)) {
      updateFields.role = role;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true });

    res.status(200).json({ message: "Profile updated", user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Update failed", error: err });
  }
};

// GET PROFILE BY UID (USER <-> ADMIN)
export const getUserProfileByUID = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ uid: req.params.uid });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user", error: err });
  }
};


// Save FCM Token Controller
export const saveFcmToken = async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id;
  const { fcmToken } = req.body;

  if (!fcmToken) {
    res.status(400).json({ message: "FCM token is required" });
    return;
  }

  await User.findByIdAndUpdate(userId, { fcmToken });
  res.status(200).json({ message: "FCM token saved" });
};


// Block or Unblock User (with optional duration in days)
export const blockOrUnblockUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId, block, reason, durationInDays } = req.body;

  if (!userId || typeof block !== "boolean") {
    res.status(400).json({ message: "userId and block (true/false) are required" });
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
      res.status(404).json({ message: "User not found" });
      return;
    }

    const user = updatedUserDoc.toObject();
    delete user.restrictions;

    res.status(200).json({
      message: block
        ? `User blocked ${durationInDays ? `for ${durationInDays} day(s)` : "permanently"}`
        : "User unblocked",
      user,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update user block status", error: err });
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

    res.status(200).json({ blockedUsers: formattedUsers });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch blocked users", error: err });
  }
};

//  Set/Update Restrictions on a User
export const setUserRestrictions = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId, restrictions } = req.body;

  if (!userId || typeof restrictions !== "object") {
    res.status(400).json({ message: "userId and restrictions are required" });
    return;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { restrictions },
      { new: true }
    ).select("-restrictions"); // remove from response if you want

    res.status(200).json({ message: "User restrictions updated", user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Failed to update restrictions", error: err });
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

    res.status(200).json({ restrictedUsers: users });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch restricted users", error: err });
  }
};