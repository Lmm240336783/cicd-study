import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { uploadAdminMediaBinary } from "@/lib/server/storage/admin-images";

/** 先检查后台请求有没有带有效登录态；没有就直接返回 401，不继续上传。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 处理后台媒体上传：校验会话、读取表单文件、上传到 Supabase Storage，再返回公开地址。 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || (!file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
      return NextResponse.json({ message: "Invalid media file" }, { status: 400 });
    }

    const data = await uploadAdminMediaBinary({
      bytes: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      filename: file.name,
    });

    return NextResponse.json({
      data,
    });
  } catch (error) {
    return createContentApiErrorResponse(error, "上传媒体失败", "admin/images/upload#post");
  }
}
