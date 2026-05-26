import type { CreateBookPayload, UpdateBookPayload } from "@/types";

/** Narrow unknown JSON values to plain object-like payloads. */
function isPayloadObject(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}

/** Check whether a payload property was explicitly provided. */
function hasOwnKey(data: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(data, key);
}

/** Normalize a create-book payload into the server-safe shape. */
export function normalizeCreateBookPayload(data: unknown): CreateBookPayload | null {
  if (!isPayloadObject(data)) {
    return null;
  }

  const title = typeof data.title === "string" ? data.title.trim() : "";
  const coverUrl = typeof data.coverUrl === "string" ? data.coverUrl.trim() : "";
  const pdfUrl = typeof data.pdfUrl === "string" ? data.pdfUrl.trim() : "";

  if (!title || !coverUrl || !pdfUrl) {
    return null;
  }

  return {
    title,
    coverUrl,
    description: typeof data.description === "string" ? data.description.trim() : "",
    pdfUrl,
    status: data.status === "published" ? "published" : "draft",
  };
}

/** Normalize an update-book payload and reject invalid partial updates. */
export function normalizeUpdateBookPayload(data: unknown): UpdateBookPayload | null {
  if (!isPayloadObject(data)) {
    return null;
  }

  const payload: UpdateBookPayload = {};

  if (hasOwnKey(data, "title")) {
    if (typeof data.title !== "string" || data.title.trim() === "") {
      return null;
    }

    payload.title = data.title.trim();
  }

  if (hasOwnKey(data, "coverUrl")) {
    if (typeof data.coverUrl !== "string" || data.coverUrl.trim() === "") {
      return null;
    }

    payload.coverUrl = data.coverUrl.trim();
  }

  if (hasOwnKey(data, "description")) {
    if (typeof data.description !== "string") {
      return null;
    }

    payload.description = data.description.trim();
  }

  if (hasOwnKey(data, "pdfUrl")) {
    if (typeof data.pdfUrl !== "string" || data.pdfUrl.trim() === "") {
      return null;
    }

    payload.pdfUrl = data.pdfUrl.trim();
  }

  if (hasOwnKey(data, "status")) {
    if (data.status !== "draft" && data.status !== "published") {
      return null;
    }

    payload.status = data.status;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}
