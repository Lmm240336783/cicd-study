import type {
  ContentStatus,
  CreateImageTagPayload,
  CreateImagePayload,
  CreateShowPayload,
  ImageTagItem,
  ImageCollectionItem,
  ShowCollectionItem,
  UpdateImageTagPayload,
  UpdateImagePayload,
  UpdateShowPayload,
} from "@/types";

export type ImageRecord = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  tags: string[] | null;
  is_featured: boolean | null;
  status: ContentStatus | null;
  created_at: string;
  updated_at: string;
};

export type ImageTagRecord = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type ShowRecord = {
  id: string;
  name: string;
  chinese_title: string | null;
  original_title: string | null;
  year: number;
  country: string;
  genres: string[] | null;
  carousel_images: string[] | null;
  rating: number | null;
  poster_url: string | null;
  summary: string | null;
  recommend_reason: string | null;
  is_featured: boolean | null;
  status: ContentStatus | null;
  created_at: string;
  updated_at: string;
};

type ImageWriteRecord = {
  title?: string;
  description?: string;
  image_url?: string;
  tags?: string[];
  is_featured?: boolean;
  status?: ContentStatus;
};

type ImageTagWriteRecord = {
  name?: string;
};

type ShowWriteRecord = {
  name?: string;
  chinese_title?: string;
  original_title?: string;
  year?: number;
  country?: string;
  genres?: string[];
  carousel_images?: string[];
  rating?: number;
  poster_url?: string;
  summary?: string;
  recommend_reason?: string;
  is_featured?: boolean;
  status?: ContentStatus;
};

/** 判断 Supabase 错误是否表示内容表还未创建或未进入 schema cache。 */
export function isMissingContentTableError(error: { message: string } | null) {
  const message = error?.message.toLowerCase() ?? "";
  return message.includes("could not find the table") && message.includes("schema cache");
}

/** 移除对象中的 undefined 字段，避免更新时覆盖数据库默认值。 */
function compactRecord<T extends Record<string, unknown>>(record: T) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) as Partial<T>;
}

/** 将 Supabase 图片记录转换为前端图片模型。 */
export function imageRecordToItem(record: ImageRecord): ImageCollectionItem {
  return {
    id: record.id,
    title: record.title,
    description: record.description ?? "",
    imageUrl: record.image_url,
    tags: record.tags ?? [],
    isFeatured: record.is_featured ?? false,
    status: record.status ?? "draft",
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/** 将图片创建参数转换为 Supabase 插入记录。 */
export function imagePayloadToInsertRecord(payload: CreateImagePayload): ImageWriteRecord {
  return {
    title: payload.title,
    description: payload.description ?? "",
    image_url: payload.imageUrl,
    tags: payload.tags ?? [],
    is_featured: payload.isFeatured ?? false,
    status: payload.status ?? "draft",
  };
}

/** 将图片更新参数转换为 Supabase 更新记录。 */
export function imagePayloadToUpdateRecord(payload: UpdateImagePayload) {
  return compactRecord<ImageWriteRecord>({
    title: payload.title,
    description: payload.description,
    image_url: payload.imageUrl,
    tags: payload.tags,
    is_featured: payload.isFeatured,
    status: payload.status,
  });
}

/** 将 Supabase 图片标签记录转换为后台标签模型。 */
export function imageTagRecordToItem(record: ImageTagRecord): ImageTagItem {
  return {
    id: record.id,
    name: record.name.trim(),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/** 将图片标签创建参数转换为 Supabase 插入记录。 */
export function imageTagPayloadToInsertRecord(payload: CreateImageTagPayload): ImageTagWriteRecord {
  return {
    name: payload.name.trim(),
  };
}

/** 将图片标签更新参数转换为 Supabase 更新记录。 */
export function imageTagPayloadToUpdateRecord(payload: UpdateImageTagPayload) {
  return compactRecord<ImageTagWriteRecord>({
    name: typeof payload.name === "string" ? payload.name.trim() : undefined,
  });
}

/** 将 Supabase 电视剧记录转换为前端电视剧模型。 */
export function showRecordToItem(record: ShowRecord): ShowCollectionItem {
  return {
    id: record.id,
    name: record.name,
    chineseTitle: record.chinese_title ?? "",
    originalTitle: record.original_title ?? "",
    year: record.year,
    country: record.country,
    genres: record.genres ?? [],
    carouselImages: record.carousel_images ?? [],
    rating: record.rating ?? 0,
    posterUrl: record.poster_url ?? "",
    summary: record.summary ?? "",
    recommendReason: record.recommend_reason ?? "",
    isFeatured: record.is_featured ?? false,
    status: record.status ?? "draft",
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/** 将电视剧创建参数转换为 Supabase 插入记录。 */
export function showPayloadToInsertRecord(payload: CreateShowPayload): ShowWriteRecord {
  return {
    name: payload.name,
    chinese_title: payload.chineseTitle ?? "",
    original_title: payload.originalTitle ?? "",
    year: payload.year,
    country: payload.country,
    genres: payload.genres ?? [],
    carousel_images: payload.carouselImages ?? [],
    rating: payload.rating ?? 0,
    poster_url: payload.posterUrl ?? "",
    summary: payload.summary ?? "",
    recommend_reason: payload.recommendReason ?? "",
    is_featured: payload.isFeatured ?? false,
    status: payload.status ?? "draft",
  };
}

/** 将电视剧更新参数转换为 Supabase 更新记录。 */
export function showPayloadToUpdateRecord(payload: UpdateShowPayload) {
  return compactRecord<ShowWriteRecord>({
    name: payload.name,
    chinese_title: payload.chineseTitle,
    original_title: payload.originalTitle,
    year: payload.year,
    country: payload.country,
    genres: payload.genres,
    carousel_images: payload.carouselImages,
    rating: payload.rating,
    poster_url: payload.posterUrl,
    summary: payload.summary,
    recommend_reason: payload.recommendReason,
    is_featured: payload.isFeatured,
    status: payload.status,
  });
}
