import multer from "multer";
import multerS3 from "multer-s3";
import s3 from "../services/s3"

const bucketName = process.env.AWS_S3_BUCKET_NAME!;

//  File filter to allow images, videos, and PDFs
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
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
  } else {
    cb(new Error("Only image and video are allowed!"));
  }
};

//  Dynamic key naming: images/, videos/, pdfs/
const getKey = (_req: any, file: Express.Multer.File, cb: Function) => {
  let folder = "others";

  if (file.mimetype.startsWith("image/")) {
    folder = "images";
  } else if (file.mimetype.startsWith("video/")) {
    folder = "videos";
  } 

  const filename = `${folder}/${Date.now()}_${file.originalname}`;
  cb(null, filename);
};

// S3 upload middleware
export const upload = multer({
  fileFilter,
  storage: multerS3({
    s3,
    bucket: bucketName,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (_req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: getKey,
  }),
});
