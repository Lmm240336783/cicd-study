import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { uploadAdminPdfBinary } from "@/lib/server/storage/admin-books";

/** Ensure the route only serves authenticated admin sessions. */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** Upload a PDF file for admin-managed book content. */
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Invalid PDF file" }, { status: 400 });
    }

    const data = await uploadAdminPdfBinary({
      bytes: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      filename: file.name,
    });

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid PDF file") {
      return NextResponse.json({ message: "Invalid PDF file" }, { status: 400 });
    }

    return createContentApiErrorResponse(error, "Failed to upload PDF", "admin/books/upload-pdf#post");
  }
}
