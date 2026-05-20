import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { deleteImageById, updateImageById } from "@/lib/server/content/store";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import type { UpdateImagePayload } from "@/types";

/** 校验后台请求是否携带有效管理员会话。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 读取并归一化图片更新请求参数。 */
async function parseUpdateImagePayload(request: NextRequest): Promise<UpdateImagePayload | null> {
  const data = (await request.json()) as Partial<UpdateImagePayload>;

  if (data.title != null && (typeof data.title !== "string" || data.title.trim() === "")) {
    return null;
  }

  if (data.imageUrl != null && (typeof data.imageUrl !== "string" || data.imageUrl.trim() === "")) {
    return null;
  }

  return {
    title: typeof data.title === "string" ? data.title.trim() : undefined,
    description: typeof data.description === "string" ? data.description : undefined,
    imageUrl: typeof data.imageUrl === "string" ? data.imageUrl.trim() : undefined,
    tags: Array.isArray(data.tags) ? data.tags.filter((item): item is string => typeof item === "string") : undefined,
    isFeatured: typeof data.isFeatured === "boolean" ? data.isFeatured : undefined,
    status: data.status === "draft" || data.status === "published" ? data.status : undefined,
  };
}

/** 更新指定图片收藏记录。 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const payload = await parseUpdateImagePayload(request);
  if (!payload) {
    return NextResponse.json({ message: "Invalid image payload" }, { status: 400 });
  }

  try {
    const updated = await updateImageById(id, payload);
    if (!updated) {
      return NextResponse.json({ message: "Image not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return createContentApiErrorResponse(error, "更新图片失败", "admin/images/[id]#patch");
  }
}

/** 删除指定图片收藏记录。 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  try {
    const deleted = await deleteImageById(id);
    if (!deleted) {
      return NextResponse.json({ message: "Image not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return createContentApiErrorResponse(error, "删除图片失败", "admin/images/[id]#delete");
  }
}
