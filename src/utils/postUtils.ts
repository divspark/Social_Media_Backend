export const determinePostType = ({
  content,
  images,
  video,
  pollOptions,
}: {
  content?: string;
  images?: string[];
  video?: string;
  pollOptions?: any[];
}): string => {
  const types = [];
  if (content) types.push("text");
  if (images && images.length > 0) types.push("image");
  if (video) types.push("video");
  if (pollOptions && pollOptions.length > 0) types.push("poll");
  return types.join("_"); // e.g., "text_image_video_poll"
};
