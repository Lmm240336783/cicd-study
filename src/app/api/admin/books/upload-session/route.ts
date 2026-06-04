import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { createBookPdfUploadSession } from "@/lib/server/tos/book-pdf";

/** 先检查后台请求有没有带有效登录态；没有就不允许申请上传会话。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 处理后台图书 PDF 上传会话申请，返回 TOS 直传所需的短时信息。 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  let body: {
    contentType?: unknown;
    fileName?: unknown;
    fileSize?: unknown;
    objectKey?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid PDF upload session payload" }, { status: 400 });
  }

  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const fileSize = typeof body.fileSize === "number" ? body.fileSize : 0;
  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const objectKey = typeof body.objectKey === "string" ? body.objectKey.trim() : "";

  if (!fileName || fileSize <= 0 || contentType !== "application/pdf") {
    return NextResponse.json({ message: "Invalid PDF upload session payload" }, { status: 400 });
  }

  try {
    const data = await createBookPdfUploadSession({
      fileName,
      fileSize,
      contentType,
      objectKey: objectKey || undefined,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return createContentApiErrorResponse(error, "Failed to create PDF upload session", "admin/books/upload-session#post");
  }
}
