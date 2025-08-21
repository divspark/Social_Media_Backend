"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRestrictedUsers = exports.setUserRestrictions = exports.getBlockedUsers = exports.blockOrUnblockUser = exports.saveFcmToken = exports.getUserProfileByUID = exports.updateOwnProfile = exports.getOwnProfile = exports.completeProfile = exports.phoneLoginOrCreate = exports.googleLoginOrCreate = void 0;
const firebase_1 = __importDefault(require("../config/firebase"));
const userModel_1 = __importDefault(require("../models/userModel"));
const cloudinaryService_1 = require("../services/cloudinaryService");
// login with google
// GOOGLE LOGIN
const googleLoginOrCreate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { idToken } = req.body;
    if (!idToken) {
        res.status(400).json({ message: "idToken is required" });
        return;
    }
    try {
        // Verify Google ID Token with Firebase Admin SDK
        const decoded = yield firebase_1.default.auth().verifyIdToken(idToken);
        const { uid } = decoded;
        // Check if user already exists in MongoDB
        let user = yield userModel_1.default.findOne({ uid });
        if (!user) {
            // Create new user if not exists
            user = yield userModel_1.default.create({
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
        });
    }
    catch (err) {
        console.error("Google login error:", err);
        res.status(401).json({ message: "Invalid token", error: err });
    }
});
exports.googleLoginOrCreate = googleLoginOrCreate;
// PHONE LOGIN or CREATE
const phoneLoginOrCreate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { idToken } = req.body;
    if (!idToken) {
        res.status(400).json({ message: "idToken is required" });
        return;
    }
    try {
        const decoded = yield firebase_1.default.auth().verifyIdToken(idToken);
        const { uid } = decoded;
        let user = yield userModel_1.default.findOne({ uid });
        if (!user) {
            user = yield userModel_1.default.create({
                uid,
                role: "pending"
            });
            res.status(201).json({ message: "New phone user created, please complete profile", user, idToken });
            return;
        }
        res.status(200).json({ message: `${user.role} phone login successful`, user, idToken });
    }
    catch (err) {
        console.error("Phone login error:", err);
        res.status(401).json({ message: "Invalid token", error: err });
    }
});
exports.phoneLoginOrCreate = phoneLoginOrCreate;
// COMPLETE PROFILE (Second Form)
const completeProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { name, email, address, role } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        if (!userId) {
            res.status(400).json({ message: "Invalid user ID" });
            return;
        }
        if (!["user", "admin"].includes(role)) {
            res.status(400).json({ message: "Invalid role. Must be 'user' or 'admin'" });
            return;
        }
        let photoURL;
        if ((_b = req.file) === null || _b === void 0 ? void 0 : _b.buffer) {
            photoURL = yield (0, cloudinaryService_1.uploadProfileImage)(req.file.buffer, "profile_pics");
        }
        const updatedUser = yield userModel_1.default.findByIdAndUpdate(userId, Object.assign({ name,
            email,
            address,
            role }, (photoURL && { photoURL })), { new: true });
        res.status(200).json({ message: "Profile completed", user: updatedUser });
    }
    catch (err) {
        res.status(500).json({ message: "Profile completion failed", error: err });
    }
});
exports.completeProfile = completeProfile;
// GET OWN PROFILE
const getOwnProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = yield userModel_1.default.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.status(200).json({ user });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch profile", error: err });
    }
});
exports.getOwnProfile = getOwnProfile;
// UPDATE OWN PROFILE (Edit Later)
const updateOwnProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { name, email, address, role } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    try {
        let photoURL;
        if ((_b = req.file) === null || _b === void 0 ? void 0 : _b.buffer) {
            photoURL = yield (0, cloudinaryService_1.uploadProfileImage)(req.file.buffer, "profile_pics");
        }
        const updateFields = Object.assign(Object.assign(Object.assign(Object.assign({}, (name && { name })), (email && { email })), (address && { address })), (photoURL && { photoURL }));
        if (role && ["user", "admin"].includes(role)) {
            updateFields.role = role;
        }
        const updatedUser = yield userModel_1.default.findByIdAndUpdate(userId, updateFields, { new: true });
        res.status(200).json({ message: "Profile updated", user: updatedUser });
    }
    catch (err) {
        res.status(500).json({ message: "Update failed", error: err });
    }
});
exports.updateOwnProfile = updateOwnProfile;
// GET PROFILE BY UID (USER <-> ADMIN)
const getUserProfileByUID = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield userModel_1.default.findOne({ uid: req.params.uid });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.status(200).json({ user });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch user", error: err });
    }
});
exports.getUserProfileByUID = getUserProfileByUID;
// Save FCM Token Controller
const saveFcmToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { fcmToken } = req.body;
    if (!fcmToken) {
        res.status(400).json({ message: "FCM token is required" });
        return;
    }
    yield userModel_1.default.findByIdAndUpdate(userId, { fcmToken });
    res.status(200).json({ message: "FCM token saved" });
});
exports.saveFcmToken = saveFcmToken;
// Block or Unblock User (with optional duration in days)
const blockOrUnblockUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, block, reason, durationInDays } = req.body;
    if (!userId || typeof block !== "boolean") {
        res.status(400).json({ message: "userId and block (true/false) are required" });
        return;
    }
    try {
        const updateFields = {
            isBlocked: block,
            blockReason: block ? reason || "" : "",
            blockedUntil: block && durationInDays
                ? new Date(Date.now() + durationInDays * 24 * 60 * 60 * 1000)
                : null,
        };
        const updatedUserDoc = yield userModel_1.default.findByIdAndUpdate(userId, updateFields, { new: true });
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
    }
    catch (err) {
        res.status(500).json({ message: "Failed to update user block status", error: err });
    }
});
exports.blockOrUnblockUser = blockOrUnblockUser;
// Get All Blocked Users
const getBlockedUsers = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield userModel_1.default.find({ isBlocked: true }).select("name email role blockedUntil blockReason");
        const formattedUsers = users.map((user) => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            blockReason: user.blockReason,
            blockedUntil: user.blockedUntil ? user.blockedUntil : "Permanent",
        }));
        res.status(200).json({ blockedUsers: formattedUsers });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch blocked users", error: err });
    }
});
exports.getBlockedUsers = getBlockedUsers;
//  Set/Update Restrictions on a User
const setUserRestrictions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, restrictions } = req.body;
    if (!userId || typeof restrictions !== "object") {
        res.status(400).json({ message: "userId and restrictions are required" });
        return;
    }
    try {
        const updatedUser = yield userModel_1.default.findByIdAndUpdate(userId, { restrictions }, { new: true }).select("-restrictions"); // remove from response if you want
        res.status(200).json({ message: "User restrictions updated", user: updatedUser });
    }
    catch (err) {
        res.status(500).json({ message: "Failed to update restrictions", error: err });
    }
});
exports.setUserRestrictions = setUserRestrictions;
const getRestrictedUsers = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield userModel_1.default.find({
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
    }
    catch (err) {
        res.status(500).json({ message: "Failed to fetch restricted users", error: err });
    }
});
exports.getRestrictedUsers = getRestrictedUsers;
