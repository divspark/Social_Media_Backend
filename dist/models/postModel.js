"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const postSchema = new mongoose_1.Schema({
    adminId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String },
    images: [{ type: String }],
    video: { type: String },
    videoThumbnail: { type: String },
    postType: {
        type: String,
        enum: ["text", "image", "video", "poll", "mixed"],
        required: true,
    },
    pollOptions: [
        {
            option: { type: String },
            votes: { type: Number, default: 0 },
            voters: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
        },
    ],
    expiresAt: { type: Date },
    // Social Interactions
    likes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: [] }],
    savedBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: [] }],
    shareCount: { type: Number, default: 0 },
    sharedBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: [] }],
    // View Tracking
    views: [
        {
            userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
            viewedAt: { type: Date, default: Date.now },
        },
    ],
    viewCount: { type: Number, default: 0 },
    category: { type: String },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Post", postSchema);
