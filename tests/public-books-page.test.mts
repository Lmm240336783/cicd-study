import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("public books list route returns listPublicBooks JSON payload", () => {
  const routePath = "src/app/api/public/books/route.ts";

  assert.equal(existsSync(routePath), true);

  const source = readFileSync(routePath, "utf8");

  assert.match(source, /listPublicBooks/);
  assert.match(source, /NextResponse\.json\(\{ data: await listPublicBooks\(\) \}\)/);
});

test("public book detail route resolves async params and 404 JSON", () => {
  const routePath = "src/app/api/public/books/[id]/route.ts";

  assert.equal(existsSync(routePath), true);

  const source = readFileSync(routePath, "utf8");

  assert.match(source, /params: Promise<\{\s*id: string;\s*\}>/);
  assert.match(source, /getPublicBookById/);
  assert.match(source, /message: "图书不存在"/);
  assert.match(source, /status: 404/);
});

test("public books list page uses runtime connection and detail links", () => {
  const pagePath = "src/app/(site)/books/page.tsx";

  assert.equal(existsSync(pagePath), true);

  const source = readFileSync(pagePath, "utf8");

  assert.match(source, /await connection\(\)/);
  assert.match(source, /listPublicBooks/);
  assert.match(source, /图书馆藏/);
  assert.match(source, /已收录 \{books\.length\} 本图书/);
  assert.match(source, /href=\{`\/books\/\$\{item\.id\}`\}/);
});

test("public book detail page embeds the PDF preview", () => {
  const pagePath = "src/app/(site)/books/[id]/page.tsx";

  assert.equal(existsSync(pagePath), true);

  const source = readFileSync(pagePath, "utf8");

  assert.match(source, /await connection\(\)/);
  assert.match(source, /getPublicBookById/);
  assert.match(source, /notFound\(\)/);
  assert.match(source, /href="\/books"/);
  assert.match(source, /馆藏精选/);
  assert.match(source, /公开书单/);
  assert.match(source, /<iframe/);
  assert.match(source, /src=\{book\.pdfUrl\}/);
  assert.match(source, /新窗口打开 PDF/);
  assert.doesNotMatch(source, /Reading Shelf/);
  assert.doesNotMatch(source, /Public Book Pick/);
});
