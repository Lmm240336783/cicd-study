import type { CreateImageAlbumPayload, UpdateImageAlbumPayload } from "@/types";

/** 清理图片 id 列表，去掉空值并按首次出现顺序去重。 */
function normalizeImageIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, allItems) => allItems.indexOf(item) === index);
}

/** 归一化后台新建图片合集请求参数。 */
export function normalizeCreateImageAlbumPayload(value: unknown): CreateImageAlbumPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Partial<CreateImageAlbumPayload>;
  if (typeof data.title !== "string" || data.title.trim() === "") {
    return null;
  }

  return {
    title: data.title.trim(),
    description: typeof data.description === "string" ? data.description.trim() : "",
    imageIds: normalizeImageIds(data.imageIds),
    status: data.status === "published" ? "published" : "draft",
  };
}

/** 归一化后台更新图片合集请求参数。 */
export function normalizeUpdateImageAlbumPayload(value: unknown): UpdateImageAlbumPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Partial<CreateImageAlbumPayload>;
  const payload: UpdateImageAlbumPayload = {};

  if (data.title != null) {
    if (typeof data.title !== "string" || data.title.trim() === "") {
      return null;
    }
    payload.title = data.title.trim();
  }

  if (data.description != null) {
    if (typeof data.description !== "string") {
      return null;
    }
    payload.description = data.description.trim();
  }

  if (data.status != null) {
    payload.status = data.status === "published" ? "published" : "draft";
  }

  if (data.imageIds != null) {
    payload.imageIds = normalizeImageIds(data.imageIds);
  }

  return Object.keys(payload).length > 0 ? payload : null;
}
