import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("book content types expose tos-backed pdf metadata", () => {
  const source = readFileSync("src/types/content.ts", "utf8");

  assert.match(source, /pdfUrl: string;/);
  assert.match(source, /pdfObjectKey: string;/);
  assert.match(source, /pdfFileName: string;/);
  assert.match(source, /pdfSizeBytes: number;/);
});

test("book records map tos object keys instead of legacy pdf_url storage urls", () => {
  const source = readFileSync("src/lib/server/content/records.ts", "utf8");

  assert.match(source, /pdf_object_key/);
  assert.match(source, /pdf_file_name/);
  assert.match(source, /pdf_size_bytes/);
  assert.doesNotMatch(source, /pdf_url: payload\.pdfUrl/);
});

test("tos server helpers exist for config sts and book pdf signing", () => {
  assert.equal(existsSync("src/lib/server/tos/config.ts"), true);
  assert.equal(existsSync("src/lib/server/tos/sts.ts"), true);
  assert.equal(existsSync("src/lib/server/tos/book-pdf.ts"), true);

  const configSource = readFileSync("src/lib/server/tos/config.ts", "utf8");
  const stsSource = readFileSync("src/lib/server/tos/sts.ts", "utf8");
  const pdfSource = readFileSync("src/lib/server/tos/book-pdf.ts", "utf8");
  const envSource = readFileSync(".env.example", "utf8");
  const packageSource = readFileSync("package.json", "utf8");

  assert.match(configSource, /TOS_BUCKET_NAME/);
  assert.match(configSource, /TOS_REGION/);
  assert.match(stsSource, /STS/);
  assert.match(pdfSource, /createBookPdfObjectKey/);
  assert.match(pdfSource, /createBookPdfSignedDownloadUrl/);
  assert.match(envSource, /TOS_BUCKET_NAME=/);
  assert.match(packageSource, /@volcengine\/tos-sdk/);
});

test("admin book upload uses tos session route instead of the legacy supabase pdf upload route", () => {
  assert.equal(existsSync("src/app/api/admin/books/upload-session/route.ts"), true);
  assert.equal(existsSync("src/lib/client/tos/book-pdf-multipart-upload.ts"), true);

  const managerSource = readFileSync("src/components/admin/BookManager.tsx", "utf8");
  const routeSource = readFileSync("src/app/api/admin/books/upload-session/route.ts", "utf8");
  const helperSource = readFileSync("src/lib/client/tos/book-pdf-multipart-upload.ts", "utf8");

  assert.match(managerSource, /uploadBookPdfWithMultipart/);
  assert.match(managerSource, /\/api\/admin\/books\/upload-session/);
  assert.doesNotMatch(managerSource, /\/api\/admin\/books\/upload-pdf/);
  assert.match(routeSource, /createBookPdfUploadSession/);
  assert.match(helperSource, /localStorage/);
  assert.match(helperSource, /createMultipartUpload/);
  assert.match(helperSource, /completeMultipartUpload/);
});

test("book store exposes stable internal pdf routes instead of persisted public urls", () => {
  const source = readFileSync("src/lib/server/content/store.ts", "utf8");

  assert.match(source, /\/api\/public\/books\/\$\{item\.id\}\/pdf/);
  assert.match(source, /\/api\/admin\/books\/\$\{item\.id\}\/pdf/);
  assert.match(source, /export async function getAdminBookById/);
});

test("book pdf access routes exist for both admin and public readers", () => {
  assert.equal(existsSync("src/app/api/admin/books/[id]/pdf/route.ts"), true);
  assert.equal(existsSync("src/app/api/public/books/[id]/pdf/route.ts"), true);

  const publicRouteSource = readFileSync("src/app/api/public/books/[id]/pdf/route.ts", "utf8");
  const adminRouteSource = readFileSync("src/app/api/admin/books/[id]/pdf/route.ts", "utf8");

  assert.match(publicRouteSource, /createBookPdfSignedDownloadUrl/);
  assert.match(adminRouteSource, /createBookPdfSignedDownloadUrl/);
  assert.match(publicRouteSource, /getPublicBookById/);
  assert.match(adminRouteSource, /getAdminBookById/);
});
