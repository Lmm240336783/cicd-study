import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { createShow } from "@/lib/server/content/store";
import { uploadLocalAdminImage } from "@/lib/server/storage/admin-images";
import type { ImportShowPayload } from "@/types";

/** 校验后台请求是否携带有效管理员会话。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 清理字符串数组字段，去掉空值并裁剪首尾空白。 */
function normalizeStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

/** 读取并校验电视剧导入 JSON 请求体。 */
async function parseImportShowPayload(request: NextRequest): Promise<ImportShowPayload | null> {
  const data = (await request.json()) as Partial<ImportShowPayload>;

  if (typeof data.name !== "string" || data.name.trim() === "") {
    return null;
  }

  const year = typeof data.year === "number" ? data.year : Number(data.year);
  if (!Number.isFinite(year)) {
    return null;
  }

  if (typeof data.country !== "string" || data.country.trim() === "") {
    return null;
  }

  return {
    name: data.name.trim(),
    chineseTitle: typeof data.chineseTitle === "string" ? data.chineseTitle.trim() : "",
    originalTitle: typeof data.originalTitle === "string" ? data.originalTitle.trim() : "",
    year,
    country: data.country.trim(),
    genres: normalizeStringList(data.genres),
    carouselImages: normalizeStringList(data.carouselImages),
    rating: typeof data.rating === "number" ? data.rating : 0,
    posterUrl: typeof data.posterUrl === "string" ? data.posterUrl.trim() : "",
    summary: typeof data.summary === "string" ? data.summary.trim() : "",
    recommendReason: typeof data.recommendReason === "string" ? data.recommendReason.trim() : "",
    isFeatured: Boolean(data.isFeatured),
    status: data.status === "published" ? "published" : "draft",
    localPosterPath: typeof data.localPosterPath === "string" ? data.localPosterPath.trim() : "",
    localCarouselPaths: normalizeStringList(data.localCarouselPaths),
  };
}

/** 导入电视剧 JSON，并把本地图片路径转换成正式公开 URL 后落库。 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const payload = await parseImportShowPayload(request);
  if (!payload) {
    return NextResponse.json({ message: "Invalid import show payload" }, { status: 400 });
  }

  try {
    const posterUrl = payload.localPosterPath ? (await uploadLocalAdminImage(payload.localPosterPath)).url : payload.posterUrl ?? "";
    const carouselImages = payload.localCarouselPaths?.length
      ? await Promise.all(payload.localCarouselPaths.map(async (localPath) => (await uploadLocalAdminImage(localPath)).url))
      : payload.carouselImages ?? [];

    const created = await createShow({
      name: payload.name,
      chineseTitle: payload.chineseTitle,
      originalTitle: payload.originalTitle,
      year: payload.year,
      country: payload.country,
      genres: payload.genres,
      carouselImages,
      rating: payload.rating,
      posterUrl,
      summary: payload.summary,
      recommendReason: payload.recommendReason,
      isFeatured: payload.isFeatured,
      status: payload.status,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return createContentApiErrorResponse(error, "导入电视剧失败", "admin/shows/import#post");
  }
}
