import { NextResponse } from "next/server";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { getPublicBookById } from "@/lib/server/content/store";
import { createBookPdfSignedDownloadUrl } from "@/lib/server/tos/book-pdf";

type PublicBookPdfRouteContext = {
  params: Promise<{ id: string }>;
};

/** 前台访问图书 PDF 时，只给已发布图书签发短时预签名地址。 */
export async function GET(_request: Request, context: PublicBookPdfRouteContext) {
  const { id } = await context.params;

  try {
    const book = await getPublicBookById(id);
    if (!book || !book.pdfObjectKey) {
      return NextResponse.json({ message: "图书不存在" }, { status: 404 });
    }

    const signedUrl = await createBookPdfSignedDownloadUrl({
      objectKey: book.pdfObjectKey,
      fileName: book.pdfFileName,
    });

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    return createContentApiErrorResponse(error, "Failed to open public book pdf", "public/books/[id]/pdf#get");
  }
}
