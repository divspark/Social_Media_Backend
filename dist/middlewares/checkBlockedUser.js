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
exports.checkBlockedUser = void 0;
const userModel_1 = __importDefault(require("../models/userModel"));
const checkBlockedUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ status: false, message: "User authentication failed" });
            return;
        }
        const user = yield userModel_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ status: false, message: "User not found" });
            return;
        }
        if (user.isBlocked) {
            if (!user.blockedUntil) {
                res.status(403).json({
                    message: "You are permanently blocked from all activities.", status: false
                });
                return;
            }
            const now = new Date();
            if (user.blockedUntil > now) {
                res.status(403).json({
                    message: `You are temporarily blocked until ${user.blockedUntil.toLocaleString()}.`, status: false
                });
                return;
            }
            // Auto-unblock if block duration has passed
            user.isBlocked = false;
            user.blockedUntil = null;
            user.blockReason = "";
            yield user.save();
        }
        next();
    }
    catch (err) {
        res.status(500).json({ status: false, message: "Block check failed", data: { error: err } });
    }
});
exports.checkBlockedUser = checkBlockedUser;
