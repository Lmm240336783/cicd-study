import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UpdateBookPayload } from "@/types";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { normalizeUpdateBookPayload } from "@/lib/server/content/book-payloads";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { deleteBookById, updateBookById } from "@/lib/server/content/store";

/** Ensure the route only serves authenticated admin sessions. */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** Parse and normalize the admin update-book request body. */
async function parseUpdateBookPayload(request: NextRequest) {
  const data = (await request.json()) as Partial<UpdateBookPayload>;
  return normalizeUpdateBookPayload(data);
}

/** Update a single admin-managed book record. */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const payload = await parseUpdateBookPayload(request);
  if (!payload) {
    return NextResponse.json({ message: "Invalid book payload" }, { status: 400 });
  }

  try {
    const updated = await updateBookById(id, payload);
    if (!updated) {
      return NextResponse.json({ message: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return createContentApiErrorResponse(error, "Failed to update book", "admin/books/[id]#patch");
  }
}

/** Delete a single admin-managed book record. */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  try {
    const deleted = await deleteBookById(id);
    if (!deleted) {
      return NextResponse.json({ message: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return createContentApiErrorResponse(error, "Failed to delete book", "admin/books/[id]#delete");
  }
}
