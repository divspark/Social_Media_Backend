"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const multer_s3_1 = __importDefault(require("multer-s3"));
const s3_1 = __importDefault(require("../services/s3"));
const bucketName = process.env.AWS_S3_BUCKET_NAME;
//  File filter to allow images, videos, and PDFs
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
        "video/x-msvideo",
        "video/webm",
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error("Only image and video are allowed!"));
    }
};
//  Dynamic key naming: images/, videos/, pdfs/
const getKey = (_req, file, cb) => {
    let folder = "others";
    if (file.mimetype.startsWith("image/")) {
        folder = "images";
    }
    else if (file.mimetype.startsWith("video/")) {
        folder = "videos";
    }
    const filename = `${folder}/${Date.now()}_${file.originalname}`;
    cb(null, filename);
};
// S3 upload middleware
exports.upload = (0, multer_1.default)({
    fileFilter,
    storage: (0, multer_s3_1.default)({
        s3: s3_1.default,
        bucket: bucketName,
        contentType: multer_s3_1.default.AUTO_CONTENT_TYPE,
        metadata: (_req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: getKey,
    }),
});
