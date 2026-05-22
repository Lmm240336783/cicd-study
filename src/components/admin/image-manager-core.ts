import type { ContentStatus, CreateImagePayload, ImageCollectionItem, ImageTagItem, UpdateImagePayload } from "@/types";

export type ImageManagerRow = ImageCollectionItem;

export type ImageManagerFormValues = {
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
  isFeatured: boolean;
  status: ContentStatus;
};

/** 保留后台图片列表真实业务字段，不额外生成前端优先级。 */
export function decorateImageRows(images: ImageCollectionItem[]): ImageManagerRow[] {
  return images;
}

/** 合并后台标签字典和当前图片标签，生成 Select 可用选项。 */
export function buildImageTagOptions(tags: ImageTagItem[], selectedTags: string[] = []) {
  return [...tags.map((tag) => tag.name), ...selectedTags]
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, allTags) => allTags.indexOf(tag) === index)
    .map((tag) => ({ value: tag, label: tag }));
}

/** 清理标签列表，去掉空值并裁剪首尾空白。 */
function normalizeTags(tags: string[]) {
  return tags.map((tag) => tag.trim()).filter(Boolean);
}

/** 为新增或编辑弹框生成默认表单值。 */
export function buildImageFormValues(image?: ImageManagerRow | null): ImageManagerFormValues {
  if (!image) {
    return {
      title: "",
      description: "",
      imageUrl: "",
      tags: [],
      isFeatured: false,
      status: "draft",
    };
  }

  return {
    title: image.title,
    description: image.description,
    imageUrl: image.imageUrl,
    tags: [...image.tags],
    isFeatured: image.isFeatured,
    status: image.status,
  };
}

/** 将图片表单值转换为创建接口请求体。 */
export function buildCreateImagePayload(values: ImageManagerFormValues): CreateImagePayload {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    imageUrl: values.imageUrl.trim(),
    tags: normalizeTags(values.tags),
    isFeatured: values.isFeatured,
    status: values.status,
  };
}

/** 将图片表单值转换为更新接口请求体。 */
export function buildUpdateImagePayload(values: ImageManagerFormValues): UpdateImagePayload {
  return buildCreateImagePayload(values);
}
