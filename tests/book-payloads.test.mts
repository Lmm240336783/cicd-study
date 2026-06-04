import assert from "node:assert/strict";
import test from "node:test";

test("normalizeCreateBookPayload trims required fields and keeps published status", async () => {
  const { normalizeCreateBookPayload } = await import("../src/lib/server/content/book-payloads.ts");

  assert.deepEqual(
    normalizeCreateBookPayload({
      title: "  The Left Hand of Darkness  ",
      coverUrl: " https://example.com/cover.jpg ",
      description: "  A classic sci-fi novel.  ",
      pdfObjectKey: " admin-book-pdfs/book-1.pdf ",
      pdfFileName: " The Left Hand of Darkness.pdf ",
      pdfSizeBytes: 4194304,
      status: "published",
    }),
    {
      title: "The Left Hand of Darkness",
      coverUrl: "https://example.com/cover.jpg",
      description: "A classic sci-fi novel.",
      pdfObjectKey: "admin-book-pdfs/book-1.pdf",
      pdfFileName: "The Left Hand of Darkness.pdf",
      pdfSizeBytes: 4194304,
      status: "published",
    },
  );
});

test("normalizeCreateBookPayload requires non-empty trimmed title, coverUrl, pdfObjectKey, pdfFileName and valid pdfSizeBytes", async () => {
  const { normalizeCreateBookPayload } = await import("../src/lib/server/content/book-payloads.ts");

  assert.equal(
    normalizeCreateBookPayload({
      title: "   ",
      coverUrl: "https://example.com/cover.jpg",
      pdfObjectKey: "admin-book-pdfs/book.pdf",
      pdfFileName: "book.pdf",
      pdfSizeBytes: 1,
    }),
    null,
  );

  assert.equal(
    normalizeCreateBookPayload({
      title: "The Dispossessed",
      coverUrl: "   ",
      pdfObjectKey: "admin-book-pdfs/book.pdf",
      pdfFileName: "book.pdf",
      pdfSizeBytes: 1,
    }),
    null,
  );

  assert.equal(
    normalizeCreateBookPayload({
      title: "The Dispossessed",
      coverUrl: "https://example.com/cover.jpg",
      pdfObjectKey: "   ",
      pdfFileName: "book.pdf",
      pdfSizeBytes: 1,
    }),
    null,
  );

  assert.equal(
    normalizeCreateBookPayload({
      title: "The Dispossessed",
      coverUrl: "https://example.com/cover.jpg",
      pdfObjectKey: "admin-book-pdfs/book.pdf",
      pdfFileName: "   ",
      pdfSizeBytes: 1,
    }),
    null,
  );

  assert.equal(
    normalizeCreateBookPayload({
      title: "The Dispossessed",
      coverUrl: "https://example.com/cover.jpg",
      pdfObjectKey: "admin-book-pdfs/book.pdf",
      pdfFileName: "book.pdf",
      pdfSizeBytes: 0,
    }),
    null,
  );
});

test("normalizeCreateBookPayload defaults description and status to draft", async () => {
  const { normalizeCreateBookPayload } = await import("../src/lib/server/content/book-payloads.ts");

  assert.deepEqual(
    normalizeCreateBookPayload({
      title: "Kindred",
      coverUrl: "https://example.com/kindred.jpg",
      pdfObjectKey: "admin-book-pdfs/kindred.pdf",
      pdfFileName: "Kindred.pdf",
      pdfSizeBytes: 1024,
      status: "archived" as never,
    }),
    {
      title: "Kindred",
      coverUrl: "https://example.com/kindred.jpg",
      description: "",
      pdfObjectKey: "admin-book-pdfs/kindred.pdf",
      pdfFileName: "Kindred.pdf",
      pdfSizeBytes: 1024,
      status: "draft",
    },
  );
});

test("normalizeCreateBookPayload rejects null, arrays, and primitive inputs", async () => {
  const { normalizeCreateBookPayload } = await import("../src/lib/server/content/book-payloads.ts");

  assert.equal(normalizeCreateBookPayload(null as never), null);
  assert.equal(normalizeCreateBookPayload([] as never), null);
  assert.equal(normalizeCreateBookPayload("book" as never), null);
  assert.equal(normalizeCreateBookPayload(42 as never), null);
  assert.equal(normalizeCreateBookPayload(true as never), null);
});

test("normalizeUpdateBookPayload trims provided fields and allows clearing description", async () => {
  const { normalizeUpdateBookPayload } = await import("../src/lib/server/content/book-payloads.ts");

  assert.deepEqual(
    normalizeUpdateBookPayload({
      title: "  Dune Messiah  ",
      coverUrl: " https://example.com/dune-messiah.jpg ",
      description: "",
      pdfObjectKey: " admin-book-pdfs/dune-messiah.pdf ",
      pdfFileName: " Dune Messiah.pdf ",
      pdfSizeBytes: 2048,
      status: "draft",
    }),
    {
      title: "Dune Messiah",
      coverUrl: "https://example.com/dune-messiah.jpg",
      description: "",
      pdfObjectKey: "admin-book-pdfs/dune-messiah.pdf",
      pdfFileName: "Dune Messiah.pdf",
      pdfSizeBytes: 2048,
      status: "draft",
    },
  );
});

test("normalizeUpdateBookPayload rejects empty title, coverUrl, pdfObjectKey, pdfFileName or invalid pdfSizeBytes when present", async () => {
  const { normalizeUpdateBookPayload } = await import("../src/lib/server/content/book-payloads.ts");

  assert.equal(normalizeUpdateBookPayload({ title: "   " }), null);
  assert.equal(normalizeUpdateBookPayload({ coverUrl: "   " }), null);
  assert.equal(normalizeUpdateBookPayload({ pdfObjectKey: "   " }), null);
  assert.equal(normalizeUpdateBookPayload({ pdfFileName: "   " }), null);
  assert.equal(normalizeUpdateBookPayload({ pdfSizeBytes: 0 }), null);
});

test("normalizeUpdateBookPayload rejects unsupported status values", async () => {
  const { normalizeUpdateBookPayload } = await import("../src/lib/server/content/book-payloads.ts");

  assert.equal(
    normalizeUpdateBookPayload({
      status: "archived" as never,
    }),
    null,
  );
});

test("normalizeUpdateBookPayload rejects null, arrays, and primitive inputs", async () => {
  const { normalizeUpdateBookPayload } = await import("../src/lib/server/content/book-payloads.ts");

  assert.equal(normalizeUpdateBookPayload(null as never), null);
  assert.equal(normalizeUpdateBookPayload([] as never), null);
  assert.equal(normalizeUpdateBookPayload("book" as never), null);
  assert.equal(normalizeUpdateBookPayload(42 as never), null);
  assert.equal(normalizeUpdateBookPayload(true as never), null);
});
