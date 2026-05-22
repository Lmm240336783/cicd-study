import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { createImageTag, listAdminImageTags } from "@/lib/server/content/store";
import type { CreateImageTagPayload } from "@/types";

/** 校验后台请求是否携带有效管理员会话。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 读取并归一化图片标签创建请求参数。 */
async function parseCreateImageTagPayload(request: NextRequest): Promise<CreateImageTagPayload | null> {
  const data = (await request.json()) as Partial<CreateImageTagPayload>;
  if (typeof data.name !== "string" || data.name.trim() === "") {
    return null;
  }

  return {
    name: data.name.trim(),
  };
}

/** 后台图片标签列表接口：要求已登录，再返回可管理的标签字典。 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    return NextResponse.json({ data: await listAdminImageTags() });
  } catch (error) {
    return createContentApiErrorResponse(error, "读取图片标签失败", "admin/image-tags#get");
  }
}

/** 后台新建图片标签接口：校验登录态和名称后写入 `image_tags` 表。 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const payload = await parseCreateImageTagPayload(request);
  if (!payload) {
    return NextResponse.json({ message: "Invalid image tag payload" }, { status: 400 });
  }

  try {
    const created = await createImageTag(payload);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return createContentApiErrorResponse(error, "创建图片标签失败", "admin/image-tags#post");
  }
}
