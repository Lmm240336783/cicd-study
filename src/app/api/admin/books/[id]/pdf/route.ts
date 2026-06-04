import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { getAdminBookById } from "@/lib/server/content/store";
import { createBookPdfSignedDownloadUrl } from "@/lib/server/tos/book-pdf";

/** 后台私有 PDF 路由必须先确认管理员会话，避免草稿文件被直接撞出来。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 管理员访问图书 PDF 时，先拿短时预签名地址，再重定向到 TOS 私有对象。 */
export async function GET(request: NextRequest, context: RouteContext<"/api/admin/books/[id]/pdf">) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;

  try {
    const book = await getAdminBookById(id);
    if (!book || !book.pdfObjectKey) {
      return NextResponse.json({ message: "图书不存在" }, { status: 404 });
    }

    const signedUrl = await createBookPdfSignedDownloadUrl({
      objectKey: book.pdfObjectKey,
      fileName: book.pdfFileName,
    });

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    return createContentApiErrorResponse(error, "Failed to open admin book pdf", "admin/books/[id]/pdf#get");
  }
}
