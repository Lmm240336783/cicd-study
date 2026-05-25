import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";
import { createSupabaseAdminClient } from "@/lib/server/supabase/admin";

const bucketName = process.env.SUPABASE_STORAGE_BUCKET;

export type AdminPdfUploadResult = {
  path: string;
  url: string;
};

type UploadAdminPdfBinaryInput = {
  bytes: Buffer;
  contentType?: string;
  filename: string;
};

/** Ensure the shared storage bucket is configured before uploading PDFs. */
function assertBucketName() {
  if (!bucketName) {
    throw new Error("Missing SUPABASE_STORAGE_BUCKET");
  }

  return bucketName;
}

/** Accept a PDF either by MIME type or a trusted .pdf filename suffix. */
function isPdfUpload(filename: string, contentType?: string) {
  return contentType === "application/pdf" || path.extname(filename).toLowerCase() === ".pdf";
}

/** Upload an admin book PDF into the shared Supabase storage bucket. */
export async function uploadAdminPdfBinary({
  bytes,
  contentType,
  filename,
}: UploadAdminPdfBinaryInput): Promise<AdminPdfUploadResult> {
  if (!isPdfUpload(filename, contentType)) {
    throw new Error("Invalid PDF file");
  }

  const resolvedBucketName = assertBucketName();
  const objectPath = `admin-book-pdfs/${randomUUID()}.pdf`;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(resolvedBucketName).upload(objectPath, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(resolvedBucketName).getPublicUrl(objectPath);
  return {
    path: objectPath,
    url: data.publicUrl,
  };
}
