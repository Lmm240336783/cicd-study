import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { deleteShowById, updateShowById } from "@/lib/server/content/store";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import type { UpdateShowPayload } from "@/types";

/** 校验后台请求是否携带有效管理员会话。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 读取并归一化电视剧更新请求参数。 */
async function parseUpdateShowPayload(request: NextRequest): Promise<UpdateShowPayload | null> {
  const data = (await request.json()) as Partial<UpdateShowPayload>;

  if (data.name != null && (typeof data.name !== "string" || data.name.trim() === "")) {
    return null;
  }

  if (data.year != null && (typeof data.year !== "number" || Number.isNaN(data.year))) {
    return null;
  }

  if (data.country != null && (typeof data.country !== "string" || data.country.trim() === "")) {
    return null;
  }

  return {
    name: typeof data.name === "string" ? data.name.trim() : undefined,
    chineseTitle: typeof data.chineseTitle === "string" ? data.chineseTitle.trim() : undefined,
    originalTitle: typeof data.originalTitle === "string" ? data.originalTitle.trim() : undefined,
    year: typeof data.year === "number" ? data.year : undefined,
    country: typeof data.country === "string" ? data.country.trim() : undefined,
    genres: Array.isArray(data.genres) ? data.genres.filter((item): item is string => typeof item === "string") : undefined,
    carouselImages: Array.isArray(data.carouselImages)
      ? data.carouselImages.filter((item): item is string => typeof item === "string")
      : undefined,
    rating: typeof data.rating === "number" ? data.rating : undefined,
    posterUrl: typeof data.posterUrl === "string" ? data.posterUrl : undefined,
    summary: typeof data.summary === "string" ? data.summary : undefined,
    recommendReason: typeof data.recommendReason === "string" ? data.recommendReason : undefined,
    isFeatured: typeof data.isFeatured === "boolean" ? data.isFeatured : undefined,
    status: data.status === "draft" || data.status === "published" ? data.status : undefined,
  };
}

/** 更新指定电视剧推荐记录。 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const payload = await parseUpdateShowPayload(request);
  if (!payload) {
    return NextResponse.json({ message: "Invalid show payload" }, { status: 400 });
  }

  try {
    const updated = await updateShowById(id, payload);
    if (!updated) {
      return NextResponse.json({ message: "Show not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return createContentApiErrorResponse(error, "更新电视剧失败", "admin/shows/[id]#patch");
  }
}

/** 删除指定电视剧推荐记录。 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  try {
    const deleted = await deleteShowById(id);
    if (!deleted) {
      return NextResponse.json({ message: "Show not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return createContentApiErrorResponse(error, "删除电视剧失败", "admin/shows/[id]#delete");
  }
}
