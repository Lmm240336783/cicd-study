import "server-only";
import type {
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
import { createSupabaseAdminClient } from "@/lib/server/supabase/admin";
import { fallbackImages, fallbackShows } from "@/lib/server/content/fallback";
import {
  imageTagPayloadToInsertRecord,
  imageTagPayloadToUpdateRecord,
  imageTagRecordToItem,
  imagePayloadToInsertRecord,
  imagePayloadToUpdateRecord,
  imageRecordToItem,
  isMissingContentTableError,
  showPayloadToInsertRecord,
  showPayloadToUpdateRecord,
  showRecordToItem,
} from "@/lib/server/content/records";
import type { ImageRecord, ImageTagRecord, ShowRecord } from "@/lib/server/content/records";

/** 统一拿到内容管理用的 Supabase admin client，后面所有内容 CRUD 都从这里出发。 */
function getContentClient() {
  return createSupabaseAdminClient();
}

/** 把 Supabase 返回的错误对象转成普通 Error，方便上层接口统一 catch 和返回文案。 */
function assertNoSupabaseError(error: { message: string } | null, action: string) {
  if (error) {
    throw new Error(`${action}失败：${error.message}`);
  }
}

/** 对兜底 mock 数据按更新时间倒序排序，让展示顺序尽量贴近真实线上列表。 */
function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/** 从兜底图片数据中推导一个只读标签列表，供本地未建表时后台下拉使用。 */
function buildFallbackImageTags(): ImageTagItem[] {
  const now = new Date(0).toISOString();
  const names = fallbackImages.flatMap((item) => item.tags).filter((tag, index, allTags) => allTags.indexOf(tag) === index);
  return names.map((name, index) => ({
    id: `fallback-image-tag-${index + 1}`,
    name,
    createdAt: now,
    updatedAt: now,
  }));
}

/** 查询前台公开图片列表：只取已发布状态，并按更新时间倒序返回。 */
export async function listPublicImages(): Promise<ImageCollectionItem[]> {
  const { data, error } = await getContentClient()
    .from("images")
    .select("*")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (isMissingContentTableError(error)) {
    return sortByUpdatedAtDesc(fallbackImages).filter((item) => item.status === "published");
  }

  assertNoSupabaseError(error, "读取公开图片列表");
  return ((data ?? []) as ImageRecord[]).map(imageRecordToItem);
}

/** 查询前台公开图片详情：必须同时满足 id 命中且状态是 published。 */
export async function getPublicImageById(id: string): Promise<ImageCollectionItem | null> {
  const { data, error } = await getContentClient()
    .from("images")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (isMissingContentTableError(error)) {
    return fallbackImages.find((item) => item.id === id && item.status === "published") ?? null;
  }

  assertNoSupabaseError(error, "读取图片详情");
  return data ? imageRecordToItem(data as ImageRecord) : null;
}

/** 查询后台图片列表：后台不限制发布状态，所以返回整张图片表。 */
export async function listAdminImages(): Promise<ImageCollectionItem[]> {
  const { data, error } = await getContentClient().from("images").select("*").order("updated_at", {
    ascending: false,
  });

  if (isMissingContentTableError(error)) {
    return sortByUpdatedAtDesc(fallbackImages);
  }

  assertNoSupabaseError(error, "读取后台图片列表");
  return ((data ?? []) as ImageRecord[]).map(imageRecordToItem);
}

/** 查询后台图片标签字典，按更新时间倒序返回。 */
export async function listAdminImageTags(): Promise<ImageTagItem[]> {
  const { data, error } = await getContentClient().from("image_tags").select("*").order("updated_at", {
    ascending: false,
  });

  if (isMissingContentTableError(error)) {
    return buildFallbackImageTags();
  }

  assertNoSupabaseError(error, "读取图片标签列表");
  return ((data ?? []) as ImageTagRecord[]).map(imageTagRecordToItem);
}

/** 往 `image_tags` 表插入一条新标签记录。 */
export async function createImageTag(payload: CreateImageTagPayload): Promise<ImageTagItem> {
  const { data, error } = await getContentClient()
    .from("image_tags")
    .insert(imageTagPayloadToInsertRecord(payload))
    .select("*")
    .single();

  assertNoSupabaseError(error, "创建图片标签");
  return imageTagRecordToItem(data as ImageTagRecord);
}

/** 按标签 id 更新一条图片标签记录。 */
export async function updateImageTagById(id: string, payload: UpdateImageTagPayload): Promise<ImageTagItem | null> {
  const { data, error } = await getContentClient()
    .from("image_tags")
    .update(imageTagPayloadToUpdateRecord(payload))
    .eq("id", id)
    .select("*")
    .maybeSingle();

  assertNoSupabaseError(error, "更新图片标签");
  return data ? imageTagRecordToItem(data as ImageTagRecord) : null;
}

/** 按标签 id 删除一条图片标签记录，并返回是否真的删除成功。 */
export async function deleteImageTagById(id: string) {
  const { data, error } = await getContentClient().from("image_tags").delete().eq("id", id).select("id").maybeSingle();

  assertNoSupabaseError(error, "删除图片标签");
  return Boolean(data);
}

/** 查询前台公开电视剧列表：只取已发布内容，并按更新时间倒序。 */
export async function listPublicShows(): Promise<ShowCollectionItem[]> {
  const { data, error } = await getContentClient()
    .from("shows")
    .select("*")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (isMissingContentTableError(error)) {
    return sortByUpdatedAtDesc(fallbackShows).filter((item) => item.status === "published");
  }

  assertNoSupabaseError(error, "读取公开电视剧列表");
  return ((data ?? []) as ShowRecord[]).map(showRecordToItem);
}

/** 查询前台公开电视剧详情：必须同时满足 id 命中且状态是 published。 */
export async function getPublicShowById(id: string): Promise<ShowCollectionItem | null> {
  const { data, error } = await getContentClient()
    .from("shows")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (isMissingContentTableError(error)) {
    return fallbackShows.find((item) => item.id === id && item.status === "published") ?? null;
  }

  assertNoSupabaseError(error, "读取电视剧详情");
  return data ? showRecordToItem(data as ShowRecord) : null;
}

/** 查询后台电视剧列表：返回后台可管理的全部电视剧记录。 */
export async function listAdminShows(): Promise<ShowCollectionItem[]> {
  const { data, error } = await getContentClient().from("shows").select("*").order("updated_at", {
    ascending: false,
  });

  if (isMissingContentTableError(error)) {
    return sortByUpdatedAtDesc(fallbackShows);
  }

  assertNoSupabaseError(error, "读取后台电视剧列表");
  return ((data ?? []) as ShowRecord[]).map(showRecordToItem);
}

/** 查询首页精选图片：只取已发布且被标记为精选的图片。 */
export async function listFeaturedImages(limit = 6): Promise<ImageCollectionItem[]> {
  const { data, error } = await getContentClient()
    .from("images")
    .select("*")
    .eq("status", "published")
    .eq("is_featured", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (isMissingContentTableError(error)) {
    return sortByUpdatedAtDesc(fallbackImages)
      .filter((item) => item.status === "published" && item.isFeatured)
      .slice(0, limit);
  }

  assertNoSupabaseError(error, "读取精选图片");
  return ((data ?? []) as ImageRecord[]).map(imageRecordToItem);
}

/** 查询首页精选电视剧：只取已发布且被标记为精选的电视剧。 */
export async function listFeaturedShows(limit = 6): Promise<ShowCollectionItem[]> {
  const { data, error } = await getContentClient()
    .from("shows")
    .select("*")
    .eq("status", "published")
    .eq("is_featured", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (isMissingContentTableError(error)) {
    return sortByUpdatedAtDesc(fallbackShows)
      .filter((item) => item.status === "published" && item.isFeatured)
      .slice(0, limit);
  }

  assertNoSupabaseError(error, "读取精选电视剧");
  return ((data ?? []) as ShowRecord[]).map(showRecordToItem);
}

/** 往 `images` 表插入一条新图片记录，并把数据库最终保存的结果返回给前端。 */
export async function createImage(payload: CreateImagePayload): Promise<ImageCollectionItem> {
  const { data, error } = await getContentClient()
    .from("images")
    .insert(imagePayloadToInsertRecord(payload))
    .select("*")
    .single();

  assertNoSupabaseError(error, "创建图片");
  return imageRecordToItem(data as ImageRecord);
}

/** 按图片 id 更新一条记录；如果 id 不存在，`maybeSingle()` 会让结果变成 `null`。 */
export async function updateImageById(id: string, payload: UpdateImagePayload): Promise<ImageCollectionItem | null> {
  const { data, error } = await getContentClient()
    .from("images")
    .update(imagePayloadToUpdateRecord(payload))
    .eq("id", id)
    .select("*")
    .maybeSingle();

  assertNoSupabaseError(error, "更新图片");
  return data ? imageRecordToItem(data as ImageRecord) : null;
}

/** 按图片 id 删除一条记录，并用是否删到数据来返回 true / false。 */
export async function deleteImageById(id: string) {
  const { data, error } = await getContentClient().from("images").delete().eq("id", id).select("id").maybeSingle();

  assertNoSupabaseError(error, "删除图片");
  return Boolean(data);
}

/** 往 `shows` 表插入一条新电视剧记录，并返回完整保存结果。 */
export async function createShow(payload: CreateShowPayload): Promise<ShowCollectionItem> {
  const { data, error } = await getContentClient()
    .from("shows")
    .insert(showPayloadToInsertRecord(payload))
    .select("*")
    .single();

  assertNoSupabaseError(error, "创建电视剧");
  return showRecordToItem(data as ShowRecord);
}

/** 按电视剧 id 更新一条记录；查不到对应 id 时返回 `null`。 */
export async function updateShowById(id: string, payload: UpdateShowPayload): Promise<ShowCollectionItem | null> {
  const { data, error } = await getContentClient()
    .from("shows")
    .update(showPayloadToUpdateRecord(payload))
    .eq("id", id)
    .select("*")
    .maybeSingle();

  assertNoSupabaseError(error, "更新电视剧");
  return data ? showRecordToItem(data as ShowRecord) : null;
}

/** 按电视剧 id 删除记录，并返回是否真的删除成功。 */
export async function deleteShowById(id: string) {
  const { data, error } = await getContentClient().from("shows").delete().eq("id", id).select("id").maybeSingle();

  assertNoSupabaseError(error, "删除电视剧");
  return Boolean(data);
}
