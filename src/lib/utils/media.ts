import type { MediaType } from "@/types";

const videoExtensions = new Set(["mp4", "webm", "mov", "m4v", "ogv"]);
const imageExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"]);

/** 判断一个 MIME 类型是不是视频。 */
export function isVideoMimeType(contentType?: string | null) {
  return typeof contentType === "string" && contentType.toLowerCase().startsWith("video/");
}

/** 判断一个 MIME 类型是不是图片。 */
export function isImageMimeType(contentType?: string | null) {
  return typeof contentType === "string" && contentType.toLowerCase().startsWith("image/");
}

/** 根据 URL、文件名或 MIME 类型推断媒体类型。 */
export function inferMediaTypeFromSource({
  url,
  filename,
  contentType,
}: {
  url?: string | null;
  filename?: string | null;
  contentType?: string | null;
}): MediaType {
  if (isVideoMimeType(contentType)) {
    return "video";
  }

  if (isImageMimeType(contentType)) {
    return "image";
  }

  const rawSource = (filename || url || "").trim().toLowerCase();
  const normalizedSource = rawSource.split("#")[0]?.split("?")[0] ?? "";
  const extension = normalizedSource.includes(".") ? normalizedSource.slice(normalizedSource.lastIndexOf(".") + 1) : "";

  if (videoExtensions.has(extension)) {
    return "video";
  }

  if (imageExtensions.has(extension)) {
    return "image";
  }

  return "image";
}
