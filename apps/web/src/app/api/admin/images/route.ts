import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createImage, listAdminImages } from "@/lib/server/content/store";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import type { CreateImagePayload } from "@/types";

/** 先检查后台请求有没有带有效登录态；没有就直接返回统一的 401 响应。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 从请求体里读出“新建图片”参数，并顺手做最基础的字段校验和裁剪。 */
async function parseCreateImagePayload(request: NextRequest): Promise<CreateImagePayload | null> {
  // `request.json()` 适合读取前端用 JSON 提交过来的创建表单。
  const data = (await request.json()) as Partial<CreateImagePayload>;
  if (typeof data.title !== "string" || data.title.trim() === "") {
    return null;
  }

  if (typeof data.imageUrl !== "string" || data.imageUrl.trim() === "") {
    return null;
  }

  return {
    title: data.title.trim(),
    imageUrl: data.imageUrl.trim(),
    description: typeof data.description === "string" ? data.description : "",
    tags: Array.isArray(data.tags) ? data.tags.filter((item): item is string => typeof item === "string") : [],
    isFeatured: Boolean(data.isFeatured),
    status: data.status === "published" ? "published" : "draft",
  };
}

/** 后台图片列表接口：要求已登录，再返回后台可管理的全部图片记录。 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    // 这里只做接口层鉴权和响应包装，真实查询交给 `listAdminImages()`。
    return NextResponse.json({ data: await listAdminImages() });
  } catch (error) {
    return createContentApiErrorResponse(error, "读取后台图片列表失败", "admin/images#get");
  }
}

/** 后台新建图片接口：校验登录态、校验参数，然后把数据写入 `images` 表。 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const payload = await parseCreateImagePayload(request);
  if (!payload) {
    return NextResponse.json({ message: "Invalid image payload" }, { status: 400 });
  }

  try {
    // 创建成功后返回 201，表示服务端已经新增了一条资源。
    const created = await createImage(payload);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return createContentApiErrorResponse(error, "创建图片失败", "admin/images#post");
  }
}
