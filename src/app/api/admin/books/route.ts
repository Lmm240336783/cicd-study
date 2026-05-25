import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { CreateBookPayload } from "@/types";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { normalizeCreateBookPayload } from "@/lib/server/content/book-payloads";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { createBook, listAdminBooks } from "@/lib/server/content/store";

/** Ensure the route only serves authenticated admin sessions. */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** Parse and normalize the admin create-book request body. */
async function parseCreateBookPayload(request: NextRequest) {
  const data = (await request.json()) as Partial<CreateBookPayload>;
  return normalizeCreateBookPayload(data);
}

/** Return the admin-visible book list. */
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    return NextResponse.json({ data: await listAdminBooks() });
  } catch (error) {
    return createContentApiErrorResponse(error, "Failed to read admin books", "admin/books#get");
  }
}

/** Create a new admin-managed book record. */
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const payload = await parseCreateBookPayload(request);
  if (!payload) {
    return NextResponse.json({ message: "Invalid book payload" }, { status: 400 });
  }

  try {
    const created = await createBook(payload);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return createContentApiErrorResponse(error, "Failed to create book", "admin/books#post");
  }
}
