import { Router } from "express";
import {
  googleLoginOrCreate,
  completeProfile,
  getOwnProfile,
  updateOwnProfile,
  getUserProfileByUID,
  saveFcmToken,
  blockOrUnblockUser,
  getBlockedUsers,
  setUserRestrictions,
  getRestrictedUsers,
  updateUserRole,
} from "../controllers/authController";
import { requireAdmin, verifyToken,checkFeatureAccess } from "../middlewares";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();

// Email & Phone Login (Auto Create if not exists)
router.post("/email-login", googleLoginOrCreate);

// Second Form - Complete Profile
router.post("/complete-profile",verifyToken,upload.single("file"),checkFeatureAccess("profileUpdate"),completeProfile);
//Update profile later
router.put("/update-profile",verifyToken,upload.single("file"),checkFeatureAccess("profileUpdate"),updateOwnProfile);
//Get current user profile
router.get("/get-profile", verifyToken, getOwnProfile);
//Admin ↔ User profile by UID
router.get("/getProfileById/:uid", verifyToken, getUserProfileByUID);

router.post("/saveFcmToken", verifyToken, saveFcmToken);
// Block / Unblock user
router.post("/block", verifyToken, requireAdmin, blockOrUnblockUser);
// Get all blocked users
router.get("/getAllblockedUser", verifyToken, requireAdmin, getBlockedUsers);
// Set user restrictions
router.post("/restrict", verifyToken, requireAdmin, setUserRestrictions);
//  Get All Users With Restrictions
router.get("/getRestricted-users", verifyToken, requireAdmin, getRestrictedUsers);

router.put("/users/:userId/role", verifyToken,requireAdmin, updateUserRole);



export default router;

