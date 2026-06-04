import "server-only";

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MediaType } from "@/types";
import { createSupabaseAdminClient } from "@/lib/server/supabase/admin";
import { inferMediaTypeFromSource, isImageMimeType, isVideoMimeType } from "@/lib/utils/media";

const bucketName = process.env.SUPABASE_STORAGE_BUCKET;

const mediaContentTypeByExtension: Record<string, string> = {
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".ogv": "video/ogg",
  ".png": "image/png",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

export type AdminMediaUploadResult = {
  mediaType: MediaType;
  path: string;
  url: string;
};

type UploadAdminMediaBinaryInput = {
  bytes: Buffer;
  contentType?: string;
  filename: string;
};

/** 确保服务端已配置图片上传使用的存储桶名称。 */
function assertBucketName() {
  if (!bucketName) {
    throw new Error("Missing SUPABASE_STORAGE_BUCKET");
  }

  return bucketName;
}

/** 从文件名或 MIME 类型里提取一个安全扩展名。 */
export function getSafeMediaExtension(filename: string, contentType: string) {
  const extension = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (extension) {
    return extension;
  }

  if (isVideoMimeType(contentType)) {
    return contentType.split("/").pop()?.replace(/[^a-z0-9]/g, "") || "mp4";
  }

  return contentType.split("/").pop()?.replace(/[^a-z0-9]/g, "") || "jpg";
}

/** 根据文件名推断媒体内容类型，供本地文件上传时复用。 */
function inferMediaContentType(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  return mediaContentTypeByExtension[extension] ?? "image/jpeg";
}

/** 把图片或视频二进制内容上传到后台统一的 Supabase Storage。 */
export async function uploadAdminMediaBinary({
  bytes,
  contentType,
  filename,
}: UploadAdminMediaBinaryInput): Promise<AdminMediaUploadResult> {
  const resolvedBucketName = assertBucketName();
  const resolvedContentType = isImageMimeType(contentType) || isVideoMimeType(contentType) ? contentType! : inferMediaContentType(filename);
  const mediaType = inferMediaTypeFromSource({ contentType: resolvedContentType, filename });
  const extension = getSafeMediaExtension(filename, resolvedContentType);
  const objectPath = `admin-images/${randomUUID()}.${extension}`;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(resolvedBucketName).upload(objectPath, bytes, {
    contentType: resolvedContentType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(resolvedBucketName).getPublicUrl(objectPath);
  return {
    mediaType,
    path: objectPath,
    url: data.publicUrl,
  };
}

/** 把图片二进制内容上传到后台统一的 Supabase Storage。 */
export async function uploadAdminImageBinary(input: UploadAdminMediaBinaryInput) {
  const uploaded = await uploadAdminMediaBinary(input);
  if (uploaded.mediaType !== "image") {
    throw new Error("Expected image upload");
  }

  return uploaded;
}

/** 读取本地图片文件并上传到后台统一的存储桶。 */
export async function uploadLocalAdminImage(localPath: string) {
  const filename = path.basename(localPath);
  const bytes = await readFile(localPath);
  return uploadAdminImageBinary({
    bytes,
    filename,
  });
}
