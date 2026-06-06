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
  const pdfObjectKey = typeof data.pdfObjectKey === "string" ? data.pdfObjectKey.trim() : "";
  const pdfFileName = typeof data.pdfFileName === "string" ? data.pdfFileName.trim() : "";
  const pdfSizeBytes = typeof data.pdfSizeBytes === "number" && Number.isFinite(data.pdfSizeBytes) ? data.pdfSizeBytes : 0;

  if (!title || !coverUrl || !pdfObjectKey || !pdfFileName || pdfSizeBytes <= 0) {
    return null;
  }

  return {
    title,
    coverUrl,
    description: typeof data.description === "string" ? data.description.trim() : "",
    pdfObjectKey,
    pdfFileName,
    pdfSizeBytes,
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

  if (hasOwnKey(data, "pdfObjectKey")) {
    if (typeof data.pdfObjectKey !== "string" || data.pdfObjectKey.trim() === "") {
      return null;
    }

    payload.pdfObjectKey = data.pdfObjectKey.trim();
  }

  if (hasOwnKey(data, "pdfFileName")) {
    if (typeof data.pdfFileName !== "string" || data.pdfFileName.trim() === "") {
      return null;
    }

    payload.pdfFileName = data.pdfFileName.trim();
  }

  if (hasOwnKey(data, "pdfSizeBytes")) {
    if (typeof data.pdfSizeBytes !== "number" || !Number.isFinite(data.pdfSizeBytes) || data.pdfSizeBytes <= 0) {
      return null;
    }

    payload.pdfSizeBytes = data.pdfSizeBytes;
  }

  if (hasOwnKey(data, "status")) {
    if (data.status !== "draft" && data.status !== "published") {
      return null;
    }

    payload.status = data.status;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}
