import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildBookFormValues,
  buildCreateBookPayload,
  buildUpdateBookPayload,
} from "../src/components/admin/book-manager-core.ts";

test("builds empty book form defaults", () => {
  assert.deepEqual(buildBookFormValues(), {
    title: "",
    coverUrl: "",
    description: "",
    pdfUrl: "",
    status: "draft",
  });
});

test("builds book form values from a selected row", () => {
  assert.deepEqual(
    buildBookFormValues({
      id: "book-1",
      title: "你当像鸟飞往你的山",
      coverUrl: "https://example.com/book-cover.jpg",
      description: "成长与自我教育。",
      pdfUrl: "https://example.com/book.pdf",
      status: "published",
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-08T00:00:00.000Z",
    }),
    {
      title: "你当像鸟飞往你的山",
      coverUrl: "https://example.com/book-cover.jpg",
      description: "成长与自我教育。",
      pdfUrl: "https://example.com/book.pdf",
      status: "published",
    },
  );
});

test("builds create book payload with trimmed text fields", () => {
  assert.deepEqual(
    buildCreateBookPayload({
      title: "  人类群星闪耀时  ",
      coverUrl: " https://example.com/cover.jpg ",
      description: "  历史瞬间群像。  ",
      pdfUrl: " https://example.com/book.pdf ",
      status: "published",
    }),
    {
      title: "人类群星闪耀时",
      coverUrl: "https://example.com/cover.jpg",
      description: "历史瞬间群像。",
      pdfUrl: "https://example.com/book.pdf",
      status: "published",
    },
  );
});

test("builds update book payload from form values", () => {
  assert.deepEqual(
    buildUpdateBookPayload({
      title: "失明症漫记",
      coverUrl: "https://example.com/blindness-cover.jpg",
      description: "",
      pdfUrl: "https://example.com/blindness.pdf",
      status: "draft",
    }),
    {
      title: "失明症漫记",
      coverUrl: "https://example.com/blindness-cover.jpg",
      description: "",
      pdfUrl: "https://example.com/blindness.pdf",
      status: "draft",
    },
  );
});

test("includes the book manager core test in the npm test script", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: { test?: string };
  };

  assert.match(packageJson.scripts?.test ?? "", /tests\/book-manager-core\.test\.mts/);
});

test("renders the admin book manager shell with pdf upload affordances", () => {
  const source = readFileSync("src/components/admin/BookManager.tsx", "utf8");

  assert.match(source, /图书管理/);
  assert.match(source, /上传 PDF/);
  assert.match(source, /\/api\/admin\/books\/upload-pdf/);
  assert.match(source, /当前 PDF/);
  assert.match(source, /Form\.useForm<BookManagerFormValues>\(\)/);
  assert.match(source, /Form\.useWatch\("pdfUrl", form\)/);
  assert.match(source, /form=\{form\}/);
  assert.match(source, /currentPdfUrl/);
  assert.match(source, /<Button[\s\S]*disabled[\s\S]*等待后端\/API 接入/);
});
