import assert from "node:assert/strict";
import test from "node:test";

test("normalizeCreateBookPayload trims required fields and keeps published status", async () => {
  const { normalizeCreateBookPayload } = await import("../src/lib/server/content/book-payloads.ts");

  assert.deepEqual(
    normalizeCreateBookPayload({
      title: "  The Left Hand of Darkness  ",
      coverUrl: " https://example.com/cover.jpg ",
      description: "  A classic sci-fi novel.  ",
      pdfUrl: " https://example.com/book.pdf ",
      status: "published",
    }),
    {
      title: "The Left Hand of Darkness",
      coverUrl: "https://example.com/cover.jpg",
      description: "A classic sci-fi novel.",
      pdfUrl: "https://example.com/book.pdf",
      status: "published",
    },
  );
});

test("normalizeCreateBookPayload requires non-empty trimmed title, coverUrl, and pdfUrl", async () => {
  const { normalizeCreateBookPayload } = await import("../src/lib/server/content/book-payloads.ts");

  assert.equal(
    normalizeCreateBookPayload({
      title: "   ",
      coverUrl: "https://example.com/cover.jpg",
      pdfUrl: "https://example.com/book.pdf",
    }),
    null,
  );

  assert.equal(
    normalizeCreateBookPayload({
      title: "The Dispossessed",
      coverUrl: "   ",
      pdfUrl: "https://example.com/book.pdf",
    }),
    null,
  );

  assert.equal(
    normalizeCreateBookPayload({
      title: "The Dispossessed",
      coverUrl: "https://example.com/cover.jpg",
      pdfUrl: "   ",
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
      pdfUrl: "https://example.com/kindred.pdf",
      status: "archived" as never,
    }),
    {
      title: "Kindred",
      coverUrl: "https://example.com/kindred.jpg",
      description: "",
      pdfUrl: "https://example.com/kindred.pdf",
      status: "draft",
    },
  );
});

test("normalizeUpdateBookPayload trims provided fields and allows clearing description", async () => {
  const { normalizeUpdateBookPayload } = await import("../src/lib/server/content/book-payloads.ts");

  assert.deepEqual(
    normalizeUpdateBookPayload({
      title: "  Dune Messiah  ",
      coverUrl: " https://example.com/dune-messiah.jpg ",
      description: "",
      pdfUrl: " https://example.com/dune-messiah.pdf ",
      status: "draft",
    }),
    {
      title: "Dune Messiah",
      coverUrl: "https://example.com/dune-messiah.jpg",
      description: "",
      pdfUrl: "https://example.com/dune-messiah.pdf",
      status: "draft",
    },
  );
});

test("normalizeUpdateBookPayload rejects empty title, coverUrl, or pdfUrl when present", async () => {
  const { normalizeUpdateBookPayload } = await import("../src/lib/server/content/book-payloads.ts");

  assert.equal(normalizeUpdateBookPayload({ title: "   " }), null);
  assert.equal(normalizeUpdateBookPayload({ coverUrl: "   " }), null);
  assert.equal(normalizeUpdateBookPayload({ pdfUrl: "   " }), null);
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
