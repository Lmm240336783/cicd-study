import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { normalizeCreateImageAlbumPayload } from "@/lib/server/content/image-album-payloads";
import { createImageAlbum, listAdminImageAlbums } from "@/lib/server/content/store";
import type { CreateImageAlbumPayload } from "@/types";

/** 校验后台图片合集接口是否带有有效登录态。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 返回后台可管理的图片合集列表。 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    return NextResponse.json({ data: await listAdminImageAlbums() });
  } catch (error) {
    return createContentApiErrorResponse(error, "读取图片合集失败", "admin/image-albums#get");
  }
}

/** 新建图片合集。 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  let payload: CreateImageAlbumPayload | null = null;
  try {
    payload = normalizeCreateImageAlbumPayload(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid image album payload" }, { status: 400 });
  }

  if (!payload) {
    return NextResponse.json({ message: "Invalid image album payload" }, { status: 400 });
  }

  try {
    const created = await createImageAlbum(payload);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return createContentApiErrorResponse(error, "创建图片合集失败", "admin/image-albums#post");
  }
}
