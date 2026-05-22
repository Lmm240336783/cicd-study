import "server-only";
import type {
  CreateImageTagPayload,
  CreateImagePayload,
  CreateShowPayload,
  ImageCollectionItem,
  ImageTagItem,
  MusicCollectionItem,
  SingerCollectionItem,
  ShowCollectionItem,
  UpdateImageTagPayload,
  UpdateImagePayload,
  UpdateShowPayload,
} from "@/types";
import { createSupabaseAdminClient } from "@/lib/server/supabase/admin";
import { fallbackImages, fallbackMusic, fallbackShows, fallbackSingers } from "@/lib/server/content/fallback";
import {
  imageTagPayloadToInsertRecord,
  imageTagPayloadToUpdateRecord,
  imageTagRecordToItem,
  imagePayloadToInsertRecord,
  imagePayloadToUpdateRecord,
  imageRecordToItem,
  isMissingContentTableError,
  musicRecordToItem,
  singerRecordToItem,
  showPayloadToInsertRecord,
  showPayloadToUpdateRecord,
  showRecordToItem,
} from "@/lib/server/content/records";
import type { ImageRecord, ImageTagRecord, MusicRecord, SingerRecord, ShowRecord } from "@/lib/server/content/records";

/** 统一获取内容读写用的 Supabase admin client。*/
function getContentClient() {
  return createSupabaseAdminClient();
}

/** 把 Supabase 错误转换成普通 Error，方便上层统一 catch。*/
function assertNoSupabaseError(error: { message: string } | null, action: string) {
  if (error) {
    throw new Error(`${action}失败：${error.message}`);
  }
}

/** 对 fallback 数据按更新时间倒序排列。*/
function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/** 从图片数据中推导一个只读标签列表。*/
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

/** 查询前台公开图片列表。*/
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

/** 查询前台公开图片详情。*/
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

/** 查询后台图片列表。*/
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

/** 查询后台图片标签列表。*/
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

/** 新增一个图片标签。*/
export async function createImageTag(payload: CreateImageTagPayload): Promise<ImageTagItem> {
  const { data, error } = await getContentClient()
    .from("image_tags")
    .insert(imageTagPayloadToInsertRecord(payload))
    .select("*")
    .single();

  assertNoSupabaseError(error, "创建图片标签");
  return imageTagRecordToItem(data as ImageTagRecord);
}

/** 按标签 id 更新一条图片标签记录。*/
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

/** 按标签 id 删除一条图片标签记录。*/
export async function deleteImageTagById(id: string) {
  const { data, error } = await getContentClient().from("image_tags").delete().eq("id", id).select("id").maybeSingle();

  assertNoSupabaseError(error, "删除图片标签");
  return Boolean(data);
}

/** 查询前台公开电视剧列表。*/
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

/** 查询前台公开电视剧详情。*/
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

/** 查询后台电视剧列表。*/
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

/** 查询首页精选图片。*/
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

/** 查询首页精选电视剧。*/
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

/** 查询前台公开音乐列表。*/
export async function listPublicMusic(): Promise<MusicCollectionItem[]> {
  const { data, error } = await getContentClient()
    .from("music")
    .select("*")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (isMissingContentTableError(error)) {
    return sortByUpdatedAtDesc(fallbackMusic).filter((item) => item.status === "published");
  }

  assertNoSupabaseError(error, "读取公开音乐列表");
  return ((data ?? []) as MusicRecord[]).map(musicRecordToItem);
}

/** 查询前台公开音乐详情。*/
export async function getPublicMusicById(id: string): Promise<MusicCollectionItem | null> {
  const { data, error } = await getContentClient()
    .from("music")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (isMissingContentTableError(error)) {
    return fallbackMusic.find((item) => item.id === id && item.status === "published") ?? null;
  }

  assertNoSupabaseError(error, "读取音乐详情");
  return data ? musicRecordToItem(data as MusicRecord) : null;
}

/** 查询指定歌手的公开音乐列表。*/
export async function listPublicMusicBySingerId(singerId: string): Promise<MusicCollectionItem[]> {
  const { data, error } = await getContentClient()
    .from("music")
    .select("*")
    .eq("status", "published")
    .eq("singer_id", singerId)
    .order("updated_at", { ascending: false });

  if (isMissingContentTableError(error)) {
    return sortByUpdatedAtDesc(fallbackMusic).filter((item) => item.status === "published" && item.singerId === singerId);
  }

  assertNoSupabaseError(error, "读取歌手歌曲列表");
  return ((data ?? []) as MusicRecord[]).map(musicRecordToItem);
}

/** 查询前台公开歌手列表。*/
export async function listPublicSingers(): Promise<SingerCollectionItem[]> {
  const { data, error } = await getContentClient()
    .from("singers")
    .select("*")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (isMissingContentTableError(error)) {
    return sortByUpdatedAtDesc(fallbackSingers).filter((item) => item.status === "published");
  }

  assertNoSupabaseError(error, "读取公开歌手列表");
  return ((data ?? []) as SingerRecord[]).map(singerRecordToItem);
}

/** 查询前台公开歌手详情。*/
export async function getPublicSingerById(id: string): Promise<SingerCollectionItem | null> {
  const { data, error } = await getContentClient()
    .from("singers")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (isMissingContentTableError(error)) {
    return fallbackSingers.find((item) => item.id === id && item.status === "published") ?? null;
  }

  assertNoSupabaseError(error, "读取歌手详情");
  return data ? singerRecordToItem(data as SingerRecord) : null;
}

/** 查询首页精选歌手。*/
export async function listFeaturedSingers(limit = 4): Promise<SingerCollectionItem[]> {
  const { data, error } = await getContentClient()
    .from("singers")
    .select("*")
    .eq("status", "published")
    .eq("is_featured", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (isMissingContentTableError(error)) {
    return sortByUpdatedAtDesc(fallbackSingers)
      .filter((item) => item.status === "published" && item.isFeatured)
      .slice(0, limit);
  }

  assertNoSupabaseError(error, "读取精选歌手");
  return ((data ?? []) as SingerRecord[]).map(singerRecordToItem);
}

/** 新增一条图片记录。*/
export async function createImage(payload: CreateImagePayload): Promise<ImageCollectionItem> {
  const { data, error } = await getContentClient()
    .from("images")
    .insert(imagePayloadToInsertRecord(payload))
    .select("*")
    .single();

  assertNoSupabaseError(error, "创建图片");
  return imageRecordToItem(data as ImageRecord);
}

/** 更新一条图片记录。*/
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

/** 删除一条图片记录。*/
export async function deleteImageById(id: string) {
  const { data, error } = await getContentClient().from("images").delete().eq("id", id).select("id").maybeSingle();

  assertNoSupabaseError(error, "删除图片");
  return Boolean(data);
}

/** 新增一条电视剧记录。*/
export async function createShow(payload: CreateShowPayload): Promise<ShowCollectionItem> {
  const { data, error } = await getContentClient()
    .from("shows")
    .insert(showPayloadToInsertRecord(payload))
    .select("*")
    .single();

  assertNoSupabaseError(error, "创建电视剧");
  return showRecordToItem(data as ShowRecord);
}

/** 更新一条电视剧记录。*/
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

/** 删除一条电视剧记录。*/
export async function deleteShowById(id: string) {
  const { data, error } = await getContentClient().from("shows").delete().eq("id", id).select("id").maybeSingle();

  assertNoSupabaseError(error, "删除电视剧");
  return Boolean(data);
}
