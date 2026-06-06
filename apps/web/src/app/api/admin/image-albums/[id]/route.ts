import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { normalizeUpdateImageAlbumPayload } from "@/lib/server/content/image-album-payloads";
import { deleteImageAlbumById, getAdminImageAlbumById, updateImageAlbumById } from "@/lib/server/content/store";
import type { UpdateImageAlbumPayload } from "@/types";

type ImageAlbumRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/** 校验后台图片合集详情接口是否带有有效登录态。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 返回后台单个图片合集详情。 */
export async function GET(request: NextRequest, { params }: ImageAlbumRouteContext) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await params;
  try {
    const album = await getAdminImageAlbumById(id);
    if (!album) {
      return NextResponse.json({ message: "Image album not found" }, { status: 404 });
    }

    return NextResponse.json({ data: album });
  } catch (error) {
    return createContentApiErrorResponse(error, "读取图片合集详情失败", "admin/image-albums/[id]#get");
  }
}

/** 更新指定图片合集。 */
export async function PATCH(request: NextRequest, { params }: ImageAlbumRouteContext) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  let payload: UpdateImageAlbumPayload | null = null;
  try {
    payload = normalizeUpdateImageAlbumPayload(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid image album payload" }, { status: 400 });
  }

  if (!payload) {
    return NextResponse.json({ message: "Invalid image album payload" }, { status: 400 });
  }

  const { id } = await params;
  try {
    const updated = await updateImageAlbumById(id, payload);
    if (!updated) {
      return NextResponse.json({ message: "Image album not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return createContentApiErrorResponse(error, "更新图片合集失败", "admin/image-albums/[id]#patch");
  }
}

/** 删除指定图片合集。 */
export async function DELETE(request: NextRequest, { params }: ImageAlbumRouteContext) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await params;
  try {
    const deleted = await deleteImageAlbumById(id);
    if (!deleted) {
      return NextResponse.json({ message: "Image album not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return createContentApiErrorResponse(error, "删除图片合集失败", "admin/image-albums/[id]#delete");
  }
}
