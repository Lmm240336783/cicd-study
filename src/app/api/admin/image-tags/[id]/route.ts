import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { deleteImageTagById, updateImageTagById } from "@/lib/server/content/store";
import type { UpdateImageTagPayload } from "@/types";

/** 校验后台请求是否携带有效管理员会话。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 读取并归一化图片标签更新请求参数。 */
async function parseUpdateImageTagPayload(request: NextRequest): Promise<UpdateImageTagPayload | null> {
  const data = (await request.json()) as Partial<UpdateImageTagPayload>;
  if (typeof data.name !== "string" || data.name.trim() === "") {
    return null;
  }

  return {
    name: data.name.trim(),
  };
}

/** 更新指定图片标签记录。 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const payload = await parseUpdateImageTagPayload(request);
  if (!payload) {
    return NextResponse.json({ message: "Invalid image tag payload" }, { status: 400 });
  }

  try {
    const updated = await updateImageTagById(id, payload);
    if (!updated) {
      return NextResponse.json({ message: "Image tag not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return createContentApiErrorResponse(error, "更新图片标签失败", "admin/image-tags/[id]#patch");
  }
}

/** 删除指定图片标签记录。 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  try {
    const deleted = await deleteImageTagById(id);
    if (!deleted) {
      return NextResponse.json({ message: "Image tag not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return createContentApiErrorResponse(error, "删除图片标签失败", "admin/image-tags/[id]#delete");
  }
}
