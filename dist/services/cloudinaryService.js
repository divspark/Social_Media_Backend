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
exports.uploadProfileImage = void 0;
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
const uploadProfileImage = (fileBuffer_1, ...args_1) => __awaiter(void 0, [fileBuffer_1, ...args_1], void 0, function* (fileBuffer, folder = "profile_pics") {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.default.uploader.upload_stream({ resource_type: "image", folder }, (error, result) => {
            if (error || !result)
                reject(error || "Upload failed");
            else
                resolve(result.secure_url);
        });
        stream.end(fileBuffer);
    });
});
exports.uploadProfileImage = uploadProfileImage;
