import type { ContentStatus, CreateImageAlbumPayload, ImageAlbumDetailItem, ImageCollectionItem, UpdateImageAlbumPayload } from "@/types";

export type ImageAlbumManagerRow = ImageAlbumDetailItem;

export type ImageAlbumManagerFormValues = {
  title: string;
  description: string;
  imageIds: string[];
  status: ContentStatus;
};

/** 保留后台图片合集列表真实业务字段，不额外生成前端字段。 */
export function decorateImageAlbumRows(albums: ImageAlbumDetailItem[]): ImageAlbumManagerRow[] {
  return albums;
}

/** 清理图片 id 列表，去掉空值并按首次出现顺序去重。 */
function normalizeImageIds(imageIds: string[]) {
  return imageIds
    .map((imageId) => imageId.trim())
    .filter(Boolean)
    .filter((imageId, index, allIds) => allIds.indexOf(imageId) === index);
}

/** 为新增或编辑弹框生成默认表单值。 */
export function buildImageAlbumFormValues(album?: ImageAlbumManagerRow | null): ImageAlbumManagerFormValues {
  if (!album) {
    return {
      title: "",
      description: "",
      imageIds: [],
      status: "draft",
    };
  }

  return {
    title: album.title,
    description: album.description,
    imageIds: album.images.map((image) => image.id),
    status: album.status,
  };
}

/** 将后台图片列表转换为合集图片选择项。 */
export function buildImageAlbumImageOptions(images: ImageCollectionItem[]) {
  return images.map((image) => ({
    value: image.id,
    label: `${image.title} · ${image.mediaType === "video" ? "视频" : "图片"} · ${image.status === "published" ? "已发布" : "草稿"}`,
  }));
}

/** 将合集表单值转换为创建接口请求体。 */
export function buildCreateImageAlbumPayload(values: ImageAlbumManagerFormValues): CreateImageAlbumPayload {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    imageIds: normalizeImageIds(values.imageIds),
    status: values.status,
  };
}

/** 将合集表单值转换为更新接口请求体。 */
export function buildUpdateImageAlbumPayload(values: ImageAlbumManagerFormValues): UpdateImageAlbumPayload {
  return buildCreateImageAlbumPayload(values);
}
