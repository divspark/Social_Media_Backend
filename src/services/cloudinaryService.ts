import cloudinary from "../utils/cloudinary";

export const uploadProfileImage = async (fileBuffer: Buffer, folder = "profile_pics"): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder },
      (error, result) => {
        if (error || !result) reject(error || "Upload failed");
        else resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};
