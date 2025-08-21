import { Router } from "express";
import {
  googleLoginOrCreate,
  phoneLoginOrCreate,
  completeProfile,
  getOwnProfile,
  updateOwnProfile,
  getUserProfileByUID,
  saveFcmToken,
  blockOrUnblockUser,
  getBlockedUsers,
  setUserRestrictions,
  getRestrictedUsers,
} from "../controllers/authController";
import { requireAdmin, verifyFirebaseToken,checkFeatureAccess } from "../middlewares";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();

// Email & Phone Login (Auto Create if not exists)
router.post("/email-login", googleLoginOrCreate);
router.post("/phone-login", phoneLoginOrCreate);

// Second Form - Complete Profile
router.post("/complete-profile",verifyFirebaseToken,upload.single("file"),checkFeatureAccess("profileUpdate"),completeProfile);
//Update profile later
router.put("/update-profile",verifyFirebaseToken,upload.single("file"),checkFeatureAccess("profileUpdate"),updateOwnProfile);
//Get current user profile
router.get("/get-profile", verifyFirebaseToken, getOwnProfile);
//Admin ↔ User profile by UID
router.get("/getProfileById/:uid", verifyFirebaseToken, getUserProfileByUID);

router.post("/saveFcmToken", verifyFirebaseToken, saveFcmToken);
// Block / Unblock user
router.post("/block", verifyFirebaseToken, requireAdmin, blockOrUnblockUser);
// Get all blocked users
router.get("/getAllblockedUser", verifyFirebaseToken, requireAdmin, getBlockedUsers);
// Set user restrictions
router.post("/restrict", verifyFirebaseToken, requireAdmin, setUserRestrictions);
//  Get All Users With Restrictions
router.get("/getRestricted-users", verifyFirebaseToken, requireAdmin, getRestrictedUsers);



export default router;

