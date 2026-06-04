import "server-only";
import type {
  BookCollectionItem,
  CreateBookPayload,
  CreateImageAlbumPayload,
  CreateImageTagPayload,
  CreateImagePayload,
  CreateShowPayload,
  ImageAlbumDetailItem,
  ImageAlbumListItem,
  ImageCollectionItem,
  ImageTagItem,
  MusicCollectionItem,
  SingerCollectionItem,
  ShowCollectionItem,
  UpdateBookPayload,
  UpdateImageAlbumPayload,
  UpdateImageTagPayload,
  UpdateImagePayload,
  UpdateShowPayload,
} from "@/types";
import { createSupabaseAdminClient } from "@/lib/server/supabase/admin";
import { fallbackImages, fallbackMusic, fallbackShows, fallbackSingers } from "@/lib/server/content/fallback";
import {
  bookPayloadToInsertRecord,
  bookPayloadToUpdateRecord,
  bookRecordToItem,
  imageAlbumImageIdsToInsertRecords,
  imageAlbumPayloadToInsertRecord,
  imageAlbumPayloadToUpdateRecord,
  imageAlbumRecordToDetailItem,
  imageAlbumRecordToListItem,
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
import type {
  BookRecord,
  ImageAlbumImageRelationRecord,
  ImageAlbumRecord,
  ImageRecord,
  ImageTagRecord,
  MusicRecord,
  SingerRecord,
  ShowRecord,
} from "@/lib/server/content/records";

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

/** 构造前台图书 PDF 私有访问路由。 */
function buildPublicBookPdfRoute(id: string) {
  return `/api/public/books/${id}/pdf`;
}

/** 构造后台图书 PDF 私有访问路由。 */
function buildAdminBookPdfRoute(id: string) {
  return `/api/admin/books/${id}/pdf`;
}

/** 把图书对象补成前台可消费的 PDF 路由形态。 */
function toPublicBookItem(record: BookRecord) {
  const item = bookRecordToItem(record);
  return {
    ...item,
    pdfUrl: `/api/public/books/${item.id}/pdf`,
  };
}

/** 把图书对象补成后台可消费的 PDF 路由形态。 */
function toAdminBookItem(record: BookRecord) {
  const item = bookRecordToItem(record);
  return {
    ...item,
    pdfUrl: `/api/admin/books/${item.id}/pdf`,
  };
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

/** 从 Supabase 关联查询结果里取出单张图片记录。 */
function readAlbumRelationImage(record: ImageAlbumImageRelationRecord): ImageRecord | null {
  if (Array.isArray(record.images)) {
    return record.images[0] ?? null;
  }

  return record.images ?? null;
}

/** 按合集 id 批量读取有序图片，并可限制只保留已发布图片。 */
async function loadImagesByAlbumIds(albumIds: string[], publicOnly: boolean) {
  if (albumIds.length === 0) {
    return new Map<string, ImageCollectionItem[]>();
  }

  const { data, error } = await getContentClient()
    .from("image_album_images")
    .select("album_id, image_id, sort_order, images(*)")
    .in("album_id", albumIds)
    .order("sort_order", { ascending: true });

  assertNoSupabaseError(error, "读取图片合集关联");

  const grouped = new Map<string, ImageCollectionItem[]>();
  for (const record of ((data ?? []) as ImageAlbumImageRelationRecord[])) {
    const imageRecord = readAlbumRelationImage(record);
    if (!imageRecord || (publicOnly && imageRecord.status !== "published")) {
      continue;
    }

    const images = grouped.get(record.album_id) ?? [];
    images.push(imageRecordToItem(imageRecord));
    grouped.set(record.album_id, images);
  }

  return grouped;
}

/** 只保留图片类型内容，避免把视频混进图片馆和首页图片位。 */
function filterImageOnlyItems(items: ImageCollectionItem[]) {
  return items.filter((item) => item.mediaType === "image");
}

/** 把合集记录补齐成列表模型，封面取第一张有序图片。 */
async function hydrateImageAlbumList(records: ImageAlbumRecord[], publicOnlyImages: boolean): Promise<ImageAlbumListItem[]> {
  const imagesByAlbumId = await loadImagesByAlbumIds(
    records.map((record) => record.id),
    publicOnlyImages,
  );

  return records.map((record) => imageAlbumRecordToListItem(record, imagesByAlbumId.get(record.id) ?? []));
}

/** 把合集记录补齐成详情模型，图片列表按关联表顺序输出。 */
async function hydrateImageAlbumDetails(records: ImageAlbumRecord[], publicOnlyImages: boolean): Promise<ImageAlbumDetailItem[]> {
  const imagesByAlbumId = await loadImagesByAlbumIds(
    records.map((record) => record.id),
    publicOnlyImages,
  );

  return records.map((record) => imageAlbumRecordToDetailItem(record, imagesByAlbumId.get(record.id) ?? []));
}

/** 覆盖指定合集的图片关联和排序。 */
async function replaceImageAlbumImages(albumId: string, imageIds: string[]) {
  const client = getContentClient();
  const { error: deleteError } = await client.from("image_album_images").delete().eq("album_id", albumId);
  assertNoSupabaseError(deleteError, "清理图片合集关联");

  const records = imageAlbumImageIdsToInsertRecords(albumId, imageIds);
  if (records.length === 0) {
    return;
  }

  const { error: insertError } = await client.from("image_album_images").insert(records);
  assertNoSupabaseError(insertError, "写入图片合集关联");
}

/** 查询前台公开图书列表。*/
export async function listPublicBooks(): Promise<BookCollectionItem[]> {
  const { data, error } = await getContentClient()
    .from("books")
    .select("*")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  assertNoSupabaseError(error, "读取公开图书列表");
  return ((data ?? []) as BookRecord[]).map(toPublicBookItem);
}

/** 查询前台公开图书详情。*/
export async function getPublicBookById(id: string): Promise<BookCollectionItem | null> {
  const { data, error } = await getContentClient()
    .from("books")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  assertNoSupabaseError(error, "读取图书详情");
  return data ? toPublicBookItem(data as BookRecord) : null;
}

/** List the admin-visible books from the books table. */
export async function listAdminBooks(): Promise<BookCollectionItem[]> {
  const { data, error } = await getContentClient().from("books").select("*").order("updated_at", {
    ascending: false,
  });

  assertNoSupabaseError(error, "读取后台图书列表");
  return ((data ?? []) as BookRecord[]).map(toAdminBookItem);
}

/** 查询后台单本图书详情，供管理员查看私有 PDF 使用。 */
export async function getAdminBookById(id: string): Promise<BookCollectionItem | null> {
  const { data, error } = await getContentClient()
    .from("books")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  assertNoSupabaseError(error, "读取后台图书详情");
  return data ? toAdminBookItem(data as BookRecord) : null;
}

export async function listPublicImages(): Promise<ImageCollectionItem[]> {
  const { data, error } = await getContentClient()
    .from("images")
    .select("*")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (isMissingContentTableError(error)) {
    return filterImageOnlyItems(sortByUpdatedAtDesc(fallbackImages).filter((item) => item.status === "published"));
  }

  assertNoSupabaseError(error, "读取公开图片列表");
  return filterImageOnlyItems(((data ?? []) as ImageRecord[]).map(imageRecordToItem));
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
    return fallbackImages.find((item) => item.id === id && item.status === "published" && item.mediaType === "image") ?? null;
  }

  assertNoSupabaseError(error, "读取图片详情");
  if (!data) {
    return null;
  }

  const item = imageRecordToItem(data as ImageRecord);
  return item.mediaType === "image" ? item : null;
}

/** 查询前台公开图片合集列表。 */
export async function listPublicImageAlbums(): Promise<ImageAlbumListItem[]> {
  const { data, error } = await getContentClient()
    .from("image_albums")
    .select("*")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  assertNoSupabaseError(error, "读取公开图片合集列表");
  return hydrateImageAlbumList((data ?? []) as ImageAlbumRecord[], true);
}

/** 查询前台公开图片合集详情。 */
export async function getPublicImageAlbumById(id: string): Promise<ImageAlbumDetailItem | null> {
  const { data, error } = await getContentClient()
    .from("image_albums")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  assertNoSupabaseError(error, "读取图片合集详情");
  if (!data) {
    return null;
  }

  const [detail] = await hydrateImageAlbumDetails([data as ImageAlbumRecord], true);
  return detail ?? null;
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

/** 查询后台图片合集列表。 */
export async function listAdminImageAlbums(): Promise<ImageAlbumDetailItem[]> {
  const { data, error } = await getContentClient().from("image_albums").select("*").order("updated_at", {
    ascending: false,
  });

  assertNoSupabaseError(error, "读取后台图片合集列表");
  return hydrateImageAlbumDetails((data ?? []) as ImageAlbumRecord[], false);
}

/** 查询后台单个图片合集详情。 */
export async function getAdminImageAlbumById(id: string): Promise<ImageAlbumDetailItem | null> {
  const { data, error } = await getContentClient().from("image_albums").select("*").eq("id", id).maybeSingle();

  assertNoSupabaseError(error, "读取后台图片合集详情");
  if (!data) {
    return null;
  }

  const [detail] = await hydrateImageAlbumDetails([data as ImageAlbumRecord], false);
  return detail ?? null;
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
    return filterImageOnlyItems(
      sortByUpdatedAtDesc(fallbackImages)
        .filter((item) => item.status === "published" && item.isFeatured)
        .slice(0, limit),
    );
  }

  assertNoSupabaseError(error, "读取精选图片");
  return filterImageOnlyItems(((data ?? []) as ImageRecord[]).map(imageRecordToItem));
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
/** Create a single admin-managed book record. */
export async function createBook(payload: CreateBookPayload): Promise<BookCollectionItem> {
  const { data, error } = await getContentClient()
    .from("books")
    .insert(bookPayloadToInsertRecord(payload))
    .select("*")
    .single();

  assertNoSupabaseError(error, "创建图书");
  return toAdminBookItem(data as BookRecord);
}

/** Update a single admin-managed book record. */
export async function updateBookById(id: string, payload: UpdateBookPayload): Promise<BookCollectionItem | null> {
  const { data, error } = await getContentClient()
    .from("books")
    .update(bookPayloadToUpdateRecord(payload))
    .eq("id", id)
    .select("*")
    .maybeSingle();

  assertNoSupabaseError(error, "更新图书");
  return data ? toAdminBookItem(data as BookRecord) : null;
}

/** Delete a single admin-managed book record. */
export async function deleteBookById(id: string) {
  const { data, error } = await getContentClient().from("books").delete().eq("id", id).select("id").maybeSingle();

  assertNoSupabaseError(error, "删除图书");
  return Boolean(data);
}

export async function createImage(payload: CreateImagePayload): Promise<ImageCollectionItem> {
  const { data, error } = await getContentClient()
    .from("images")
    .insert(imagePayloadToInsertRecord(payload))
    .select("*")
    .single();

  assertNoSupabaseError(error, "创建图片");
  return imageRecordToItem(data as ImageRecord);
}

/** 新增一条图片合集记录并保存有序图片关联。 */
export async function createImageAlbum(payload: CreateImageAlbumPayload): Promise<ImageAlbumDetailItem> {
  const { data, error } = await getContentClient()
    .from("image_albums")
    .insert(imageAlbumPayloadToInsertRecord(payload))
    .select("*")
    .single();

  assertNoSupabaseError(error, "创建图片合集");
  const album = data as ImageAlbumRecord;
  await replaceImageAlbumImages(album.id, payload.imageIds ?? []);

  const created = await getAdminImageAlbumById(album.id);
  if (!created) {
    throw new Error("创建图片合集失败：创建后无法读取记录");
  }

  return created;
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

/** 更新一条图片合集记录，并在传入图片列表时覆盖关联顺序。 */
export async function updateImageAlbumById(id: string, payload: UpdateImageAlbumPayload): Promise<ImageAlbumDetailItem | null> {
  const updateRecord = imageAlbumPayloadToUpdateRecord(payload);
  let data: ImageAlbumRecord | null = null;

  if (Object.keys(updateRecord).length > 0) {
    const result = await getContentClient()
      .from("image_albums")
      .update(updateRecord)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    assertNoSupabaseError(result.error, "更新图片合集");
    data = result.data as ImageAlbumRecord | null;
  } else {
    const result = await getContentClient().from("image_albums").select("*").eq("id", id).maybeSingle();

    assertNoSupabaseError(result.error, "读取图片合集详情");
    data = result.data as ImageAlbumRecord | null;
  }

  if (!data) {
    return null;
  }

  if (payload.imageIds) {
    await replaceImageAlbumImages(id, payload.imageIds);
  }

  return getAdminImageAlbumById(id);
}

/** 删除一条图片记录。*/
export async function deleteImageById(id: string) {
  const { data, error } = await getContentClient().from("images").delete().eq("id", id).select("id").maybeSingle();

  assertNoSupabaseError(error, "删除图片");
  return Boolean(data);
}

/** 删除一条图片合集记录。 */
export async function deleteImageAlbumById(id: string) {
  const { data, error } = await getContentClient().from("image_albums").delete().eq("id", id).select("id").maybeSingle();

  assertNoSupabaseError(error, "删除图片合集");
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
