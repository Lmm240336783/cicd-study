import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createShow, listAdminShows } from "@/lib/server/content/store";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import type { CreateShowPayload } from "@/types";

/** 先检查后台请求有没有带有效登录态；没有就直接返回统一的 401 响应。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 从请求体里读出“新建电视剧”参数，并做最基础的字段校验和格式整理。 */
async function parseCreateShowPayload(request: NextRequest): Promise<CreateShowPayload | null> {
  // 这里使用 `request.json()` 读取前端提交的 JSON 表单。
  const data = (await request.json()) as Partial<CreateShowPayload>;
  if (typeof data.name !== "string" || data.name.trim() === "") {
    return null;
  }

  if (typeof data.year !== "number" || Number.isNaN(data.year)) {
    return null;
  }

  if (typeof data.country !== "string" || data.country.trim() === "") {
    return null;
  }

  return {
    name: data.name.trim(),
    chineseTitle: typeof data.chineseTitle === "string" ? data.chineseTitle.trim() : "",
    originalTitle: typeof data.originalTitle === "string" ? data.originalTitle.trim() : "",
    year: data.year,
    country: data.country.trim(),
    genres: Array.isArray(data.genres) ? data.genres.filter((item): item is string => typeof item === "string") : [],
    carouselImages: Array.isArray(data.carouselImages)
      ? data.carouselImages.filter((item): item is string => typeof item === "string")
      : [],
    rating: typeof data.rating === "number" ? data.rating : 0,
    posterUrl: typeof data.posterUrl === "string" ? data.posterUrl : "",
    summary: typeof data.summary === "string" ? data.summary : "",
    recommendReason: typeof data.recommendReason === "string" ? data.recommendReason : "",
    isFeatured: Boolean(data.isFeatured),
    status: data.status === "published" ? "published" : "draft",
  };
}

/** 后台电视剧列表接口：要求已登录，再返回后台可管理的全部电视剧记录。 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    // 查询逻辑都封装在 `listAdminShows()`，Route Handler 只负责鉴权和输出 JSON。
    return NextResponse.json({ data: await listAdminShows() });
  } catch (error) {
    return createContentApiErrorResponse(error, "读取后台电视剧列表失败", "admin/shows#get");
  }
}

/** 后台新建电视剧接口：校验登录态、校验参数，然后把数据写入 `shows` 表。 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const payload = await parseCreateShowPayload(request);
  if (!payload) {
    return NextResponse.json({ message: "Invalid show payload" }, { status: 400 });
  }

  try {
    // 创建成功后返回 201，告诉前端这条电视剧资源已经创建完成。
    const created = await createShow(payload);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return createContentApiErrorResponse(error, "创建电视剧失败", "admin/shows#post");
  }
}
