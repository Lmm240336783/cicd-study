import assert from "node:assert/strict";
import test from "node:test";
import { createContentApiErrorResponse } from "../src/lib/server/content/api-error.ts";
import {
  bookPayloadToInsertRecord,
  bookPayloadToUpdateRecord,
  bookRecordToItem,
  imageTagPayloadToInsertRecord,
  imageTagPayloadToUpdateRecord,
  imageTagRecordToItem,
  imagePayloadToInsertRecord,
  imageRecordToItem,
  isMissingContentTableError,
  musicPayloadToInsertRecord,
  musicRecordToItem,
  singerPayloadToInsertRecord,
  singerRecordToItem,
  showPayloadToInsertRecord,
  showRecordToItem,
} from "../src/lib/server/content/records.ts";

test("maps Supabase image records to public image items", () => {
  assert.deepEqual(
    imageRecordToItem({
      id: "image-1",
      title: "海边日落",
      description: "暖色氛围",
      image_url: "https://example.com/sunset.jpg",
      tags: ["旅行", "自然"],
      is_featured: true,
      status: "published",
      created_at: "2026-05-08T00:00:00.000Z",
      updated_at: "2026-05-09T00:00:00.000Z",
    }),
    {
      id: "image-1",
      title: "海边日落",
      description: "暖色氛围",
      imageUrl: "https://example.com/sunset.jpg",
      tags: ["旅行", "自然"],
      isFeatured: true,
      status: "published",
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-09T00:00:00.000Z",
    },
  );
});

test("maps image create payloads to Supabase insert records", () => {
  assert.deepEqual(
    imagePayloadToInsertRecord({
      title: "海边日落",
      description: "暖色氛围",
      imageUrl: "https://example.com/sunset.jpg",
      tags: ["旅行", "自然"],
      isFeatured: true,
      status: "published",
    }),
    {
      title: "海边日落",
      description: "暖色氛围",
      image_url: "https://example.com/sunset.jpg",
      tags: ["旅行", "自然"],
      is_featured: true,
      status: "published",
    },
  );
});

test("maps Supabase book records to public book items", () => {
  assert.deepEqual(
    bookRecordToItem({
      id: "book-1",
      title: "深夜书店",
      cover_url: "https://example.com/book-cover.jpg",
      description: null,
      pdf_object_key: "admin-book-pdfs/book-1.pdf",
      pdf_file_name: "深夜书店.pdf",
      pdf_size_bytes: 1048576,
      status: null,
      created_at: "2026-05-08T00:00:00.000Z",
      updated_at: "2026-05-09T00:00:00.000Z",
    }),
    {
      id: "book-1",
      title: "深夜书店",
      coverUrl: "https://example.com/book-cover.jpg",
      description: "",
      pdfUrl: "",
      pdfObjectKey: "admin-book-pdfs/book-1.pdf",
      pdfFileName: "深夜书店.pdf",
      pdfSizeBytes: 1048576,
      status: "draft",
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-09T00:00:00.000Z",
    },
  );
});

test("maps book create payloads to Supabase insert records", () => {
  assert.deepEqual(
    bookPayloadToInsertRecord({
      title: "深夜书店",
      coverUrl: "https://example.com/book-cover.jpg",
      pdfObjectKey: "admin-book-pdfs/book-1.pdf",
      pdfFileName: "深夜书店.pdf",
      pdfSizeBytes: 1048576,
    }),
    {
      title: "深夜书店",
      cover_url: "https://example.com/book-cover.jpg",
      description: "",
      pdf_object_key: "admin-book-pdfs/book-1.pdf",
      pdf_file_name: "深夜书店.pdf",
      pdf_size_bytes: 1048576,
      status: "draft",
    },
  );

  assert.deepEqual(
    bookPayloadToInsertRecord({
      title: "纸上城",
      coverUrl: "https://example.com/book-city-cover.jpg",
      description: "城市与记忆的短篇集",
      pdfObjectKey: "admin-book-pdfs/book-city.pdf",
      pdfFileName: "纸上城.pdf",
      pdfSizeBytes: 2097152,
      status: "published",
    }),
    {
      title: "纸上城",
      cover_url: "https://example.com/book-city-cover.jpg",
      description: "城市与记忆的短篇集",
      pdf_object_key: "admin-book-pdfs/book-city.pdf",
      pdf_file_name: "纸上城.pdf",
      pdf_size_bytes: 2097152,
      status: "published",
    },
  );
});

test("maps book update payloads to compact Supabase update records", () => {
  assert.deepEqual(
    bookPayloadToUpdateRecord({
      title: "深夜书店",
      coverUrl: undefined,
      description: "",
      pdfObjectKey: undefined,
      pdfFileName: undefined,
      pdfSizeBytes: undefined,
      status: undefined,
    }),
    {
      title: "深夜书店",
      description: "",
    },
  );

  assert.deepEqual(
    bookPayloadToUpdateRecord({
      coverUrl: "https://example.com/book-city-cover.jpg",
      description: "补充了修订版前言",
      pdfObjectKey: "admin-book-pdfs/book-city-revised.pdf",
      pdfFileName: "纸上城-修订版.pdf",
      pdfSizeBytes: 3145728,
      status: "published",
    }),
    {
      cover_url: "https://example.com/book-city-cover.jpg",
      description: "补充了修订版前言",
      pdf_object_key: "admin-book-pdfs/book-city-revised.pdf",
      pdf_file_name: "纸上城-修订版.pdf",
      pdf_size_bytes: 3145728,
      status: "published",
    },
  );
});

test("maps Supabase image tag records to admin image tag items", () => {
  assert.deepEqual(
    imageTagRecordToItem({
      id: "tag-1",
      name: "  旅行  ",
      created_at: "2026-05-08T00:00:00.000Z",
      updated_at: "2026-05-09T00:00:00.000Z",
    }),
    {
      id: "tag-1",
      name: "旅行",
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-09T00:00:00.000Z",
    },
  );
});

test("maps image tag write payloads with trimmed names", () => {
  assert.deepEqual(imageTagPayloadToInsertRecord({ name: "  建筑  " }), { name: "建筑" });
  assert.deepEqual(imageTagPayloadToUpdateRecord({ name: "  自然  " }), { name: "自然" });
});

test("maps Supabase show records to public show items", () => {
  assert.deepEqual(
    showRecordToItem({
      id: "show-1",
      name: "Dark",
      chinese_title: "暗黑",
      original_title: "Dark",
      year: 2017,
      country: "DE",
      genres: ["Sci-Fi", "Mystery"],
      carousel_images: ["https://example.com/dark-1.jpg", "https://example.com/dark-2.jpg"],
      rating: 8.9,
      poster_url: "https://example.com/dark.jpg",
      summary: "时间循环。",
      recommend_reason: "严谨。",
      is_featured: true,
      status: "published",
      created_at: "2026-05-08T00:00:00.000Z",
      updated_at: "2026-05-09T00:00:00.000Z",
    }),
    {
      id: "show-1",
      name: "Dark",
      chineseTitle: "暗黑",
      originalTitle: "Dark",
      year: 2017,
      country: "DE",
      genres: ["Sci-Fi", "Mystery"],
      carouselImages: ["https://example.com/dark-1.jpg", "https://example.com/dark-2.jpg"],
      rating: 8.9,
      posterUrl: "https://example.com/dark.jpg",
      summary: "时间循环。",
      recommendReason: "严谨。",
      isFeatured: true,
      status: "published",
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-09T00:00:00.000Z",
    },
  );
});

test("maps show create payloads to Supabase insert records", () => {
  assert.deepEqual(
    showPayloadToInsertRecord({
      name: "Dark",
      chineseTitle: "暗黑",
      originalTitle: "Dark",
      year: 2017,
      country: "DE",
      genres: ["Sci-Fi", "Mystery"],
      carouselImages: ["https://example.com/dark-1.jpg", "https://example.com/dark-2.jpg"],
      rating: 8.9,
      posterUrl: "https://example.com/dark.jpg",
      summary: "时间循环。",
      recommendReason: "严谨。",
      isFeatured: true,
      status: "published",
    }),
    {
      name: "Dark",
      chinese_title: "暗黑",
      original_title: "Dark",
      year: 2017,
      country: "DE",
      genres: ["Sci-Fi", "Mystery"],
      carousel_images: ["https://example.com/dark-1.jpg", "https://example.com/dark-2.jpg"],
      rating: 8.9,
      poster_url: "https://example.com/dark.jpg",
      summary: "时间循环。",
      recommend_reason: "严谨。",
      is_featured: true,
      status: "published",
    },
  );
});

test("maps Supabase singer records to public singer items", () => {
  assert.deepEqual(
    singerRecordToItem({
      id: "singer-1",
      name: "Luna Park",
      photo_url: "https://example.com/luna.jpg",
      is_featured: true,
      status: "published",
      created_at: "2026-05-08T00:00:00.000Z",
      updated_at: "2026-05-09T00:00:00.000Z",
    }),
    {
      id: "singer-1",
      name: "Luna Park",
      photoUrl: "https://example.com/luna.jpg",
      isFeatured: true,
      status: "published",
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-09T00:00:00.000Z",
    },
  );
});

test("maps Supabase music records to public music items", () => {
  assert.deepEqual(
    musicRecordToItem({
      id: "music-1",
      title: "Midnight Radio",
      singer_id: "singer-1",
      album: "Night Drive",
      genre: "Synth Pop",
      duration: "03:42",
      cover_url: "https://example.com/music.jpg",
      description: "Night drive anthem",
      is_featured: true,
      status: "published",
      created_at: "2026-05-08T00:00:00.000Z",
      updated_at: "2026-05-09T00:00:00.000Z",
    }),
    {
      id: "music-1",
      title: "Midnight Radio",
      singerId: "singer-1",
      album: "Night Drive",
      genre: "Synth Pop",
      duration: "03:42",
      coverUrl: "https://example.com/music.jpg",
      description: "Night drive anthem",
      isFeatured: true,
      status: "published",
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-09T00:00:00.000Z",
    },
  );
});

test("maps singer and music create payloads to Supabase insert records", () => {
  assert.deepEqual(singerPayloadToInsertRecord({ name: "  Luna Park  ", photoUrl: " https://example.com/luna.jpg ", isFeatured: true, status: "published" }), {
    name: "  Luna Park  ",
    photo_url: " https://example.com/luna.jpg ",
    is_featured: true,
    status: "published",
  });

  assert.deepEqual(
    musicPayloadToInsertRecord({
      title: "  Midnight Radio  ",
      singerId: "singer-1",
      album: " Night Drive ",
      genre: " Synth Pop ",
      duration: " 03:42 ",
      coverUrl: " https://example.com/music.jpg ",
      description: " Night drive anthem ",
      isFeatured: true,
      status: "published",
    }),
    {
      title: "  Midnight Radio  ",
      singer_id: "singer-1",
      album: " Night Drive ",
      genre: " Synth Pop ",
      duration: " 03:42 ",
      cover_url: " https://example.com/music.jpg ",
      description: " Night drive anthem ",
      is_featured: true,
      status: "published",
    },
  );
});

test("detects missing Supabase content table errors", () => {
  assert.equal(
    isMissingContentTableError({
      message: "Could not find the table 'public.images' in the schema cache",
    }),
    true,
  );
  assert.equal(isMissingContentTableError({ message: "permission denied for table images" }), false);
  assert.equal(isMissingContentTableError(null), false);
});

test("logs content api errors and returns the original message for debugging", async () => {
  const originalConsoleError = console.error;
  const loggedCalls: unknown[][] = [];

  console.error = (...args: unknown[]) => {
    loggedCalls.push(args);
  };

  try {
    const response = createContentApiErrorResponse(
      new Error("创建图片失败：Could not find the table 'public.images' in the schema cache"),
      "创建图片失败",
      "admin/images#post",
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      message: "创建图片失败：Could not find the table 'public.images' in the schema cache",
    });
    assert.equal(loggedCalls.length, 1);
    const logLine = String(loggedCalls[0]?.[0] ?? "");
    assert.match(logLine, /\[content-api\]/);
    assert.match(logLine, /"context":"admin\/images#post"/);
    assert.match(logLine, /"fallbackMessage":"创建图片失败"/);
    assert.match(logLine, /"resolvedMessage":"创建图片失败：Could not find the table 'public\.images' in the schema cache"/);
    assert.match(logLine, /"errorName":"Error"/);
    assert.match(logLine, /"errorMessage":"创建图片失败：Could not find the table 'public\.images' in the schema cache"/);
  } finally {
    console.error = originalConsoleError;
  }
});
