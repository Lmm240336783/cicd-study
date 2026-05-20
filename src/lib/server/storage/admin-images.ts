import "server-only";

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createSupabaseAdminClient } from "@/lib/server/supabase/admin";

const bucketName = process.env.SUPABASE_STORAGE_BUCKET;

const imageContentTypeByExtension: Record<string, string> = {
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export type AdminImageUploadResult = {
  path: string;
  url: string;
};

type UploadAdminImageBinaryInput = {
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
export function getSafeImageExtension(filename: string, contentType: string) {
  const extension = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (extension) {
    return extension;
  }

  return contentType.split("/").pop()?.replace(/[^a-z0-9]/g, "") || "jpg";
}

/** 根据文件名推断图片内容类型，供本地文件上传时复用。 */
function inferImageContentType(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  return imageContentTypeByExtension[extension] ?? "image/jpeg";
}

/** 把图片二进制内容上传到后台统一的 Supabase Storage。 */
export async function uploadAdminImageBinary({
  bytes,
  contentType,
  filename,
}: UploadAdminImageBinaryInput): Promise<AdminImageUploadResult> {
  const resolvedBucketName = assertBucketName();

  const resolvedContentType = contentType?.startsWith("image/") ? contentType : inferImageContentType(filename);
  const extension = getSafeImageExtension(filename, resolvedContentType);
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
    path: objectPath,
    url: data.publicUrl,
  };
}

/** 读取本地图片文件并上传到后台统一的存储桶。 */
export async function uploadLocalAdminImage(localPath: string): Promise<AdminImageUploadResult> {
  const filename = path.basename(localPath);
  const bytes = await readFile(localPath);
  return uploadAdminImageBinary({
    bytes,
    filename,
  });
}
