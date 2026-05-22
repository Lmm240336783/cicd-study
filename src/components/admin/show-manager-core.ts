import type { ContentStatus, CreateShowPayload, ImportShowPayload, ShowCollectionItem, UpdateShowPayload } from "@/types";

export type ShowManagerFormValues = {
  name: string;
  chineseTitle: string;
  originalTitle: string;
  year: number;
  country: string;
  genres: string[];
  carouselImages: string[];
  rating: number;
  posterUrl: string;
  summary: string;
  recommendReason: string;
  isFeatured: boolean;
  status: ContentStatus;
};

/** 判断导入 JSON 值是否为可读取字段的普通对象。 */
function isImportRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 清理类型标签列表，去掉空值并裁剪首尾空白。 */
function normalizeGenres(genres: string[]) {
  return genres.map((genre) => genre.trim()).filter(Boolean);
}

/** 清理轮播图地址列表，去掉空值并裁剪首尾空白。 */
function normalizeCarouselImages(images: string[]) {
  return images.map((image) => image.trim()).filter(Boolean);
}

/** 清理本地图片路径列表，去掉空值并裁剪首尾空白。 */
function normalizeLocalImagePaths(paths: string[]) {
  return paths.map((item) => item.trim()).filter(Boolean);
}

/** 将导入 JSON 转成可提交给后台导入接口的电视剧数据。 */
export function buildImportedShowPayload(value: unknown): ImportShowPayload {
  if (!isImportRecord(value)) {
    throw new Error("导入 JSON 必须是一个对象");
  }

  const year = typeof value.year === "number" ? value.year : Number(value.year);
  if (!Number.isFinite(year)) {
    throw new Error("导入 JSON 缺少有效年份");
  }

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const country = typeof value.country === "string" ? value.country.trim() : "";
  if (!name || !country) {
    throw new Error("导入 JSON 缺少必填字段 name 或 country");
  }

  return {
    name,
    chineseTitle: typeof value.chineseTitle === "string" ? value.chineseTitle.trim() : "",
    originalTitle: typeof value.originalTitle === "string" ? value.originalTitle.trim() : "",
    year,
    country,
    genres: normalizeGenres(Array.isArray(value.genres) ? value.genres.filter((item): item is string => typeof item === "string") : []),
    carouselImages: normalizeCarouselImages(
      Array.isArray(value.carouselImages) ? value.carouselImages.filter((item): item is string => typeof item === "string") : [],
    ),
    rating: typeof value.rating === "number" ? value.rating : 0,
    posterUrl: typeof value.posterUrl === "string" ? value.posterUrl.trim() : "",
    summary: typeof value.summary === "string" ? value.summary.trim() : "",
    recommendReason: typeof value.recommendReason === "string" ? value.recommendReason.trim() : "",
    isFeatured: Boolean(value.isFeatured),
    status: value.status === "published" ? "published" : "draft",
    localPosterPath: typeof value.localPosterPath === "string" ? value.localPosterPath.trim() : "",
    localCarouselPaths: normalizeLocalImagePaths(
      Array.isArray(value.localCarouselPaths)
        ? value.localCarouselPaths.filter((item): item is string => typeof item === "string")
        : [],
    ),
  };
}

/** 选择最终保存的电视剧海报 URL，优先使用刚上传完成的地址。 */
export function buildShowPosterUrl(uploadedUrl: string | undefined, formPosterUrl: string) {
  return (uploadedUrl || formPosterUrl).trim();
}

/** 为新增或编辑弹框生成电视剧表单默认值。 */
export function buildShowFormValues(show?: ShowCollectionItem | null): ShowManagerFormValues {
  if (!show) {
    return {
      name: "",
      chineseTitle: "",
      originalTitle: "",
      year: new Date().getFullYear(),
      country: "",
      genres: [],
      carouselImages: [],
      rating: 0,
      posterUrl: "",
      summary: "",
      recommendReason: "",
      isFeatured: false,
      status: "draft",
    };
  }

  return {
    name: show.name,
    chineseTitle: show.chineseTitle,
    originalTitle: show.originalTitle,
    year: show.year,
    country: show.country,
    genres: [...show.genres],
    carouselImages: [...show.carouselImages],
    rating: show.rating,
    posterUrl: show.posterUrl,
    summary: show.summary,
    recommendReason: show.recommendReason,
    isFeatured: show.isFeatured,
    status: show.status,
  };
}

/** 将电视剧表单值转换为创建接口请求体。 */
export function buildCreateShowPayload(values: ShowManagerFormValues): CreateShowPayload {
  return {
    name: values.name.trim(),
    chineseTitle: values.chineseTitle.trim(),
    originalTitle: values.originalTitle.trim(),
    year: values.year,
    country: values.country.trim(),
    genres: normalizeGenres(values.genres),
    carouselImages: normalizeCarouselImages(values.carouselImages),
    rating: values.rating,
    posterUrl: values.posterUrl.trim(),
    summary: values.summary.trim(),
    recommendReason: values.recommendReason.trim(),
    isFeatured: values.isFeatured,
    status: values.status,
  };
}

/** 将电视剧表单值转换为更新接口请求体。 */
export function buildUpdateShowPayload(values: ShowManagerFormValues): UpdateShowPayload {
  return buildCreateShowPayload(values);
}
