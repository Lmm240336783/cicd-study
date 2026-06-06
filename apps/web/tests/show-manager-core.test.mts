import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildImportedShowPayload,
  buildCreateShowPayload,
  buildShowPosterUrl,
  buildShowFormValues,
  buildUpdateShowPayload,
} from "../src/components/admin/show-manager-core.ts";

test("builds empty show form defaults", () => {
  assert.deepEqual(buildShowFormValues(), {
    name: "",
    chineseTitle: "",
    originalTitle: "",
    year: new Date().getFullYear(),
    country: "",
    genres: [],
    carouselImages: [],
    rating: 0,
    posterUrl: "",
    summary: "",
    recommendReason: "",
    isFeatured: false,
    status: "draft",
  });
});

test("builds show form values from a selected row", () => {
  assert.deepEqual(
    buildShowFormValues({
      id: "show-dark",
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
      updatedAt: "2026-05-08T00:00:00.000Z",
    }),
    {
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
    },
  );
});

test("builds create show payload with normalized values", () => {
  assert.deepEqual(
    buildCreateShowPayload({
      name: "  The Bear ",
      chineseTitle: "  熊家餐馆 ",
      originalTitle: " The Bear ",
      year: 2022,
      country: " US ",
      genres: [" Drama ", "", "Comedy"],
      carouselImages: [" https://example.com/bear-1.jpg ", "", "https://example.com/bear-2.jpg "],
      rating: 9.1,
      posterUrl: " https://example.com/bear.jpg ",
      summary: " 高压成长故事 ",
      recommendReason: " 节奏极好 ",
      isFeatured: true,
      status: "published",
    }),
    {
      name: "The Bear",
      chineseTitle: "熊家餐馆",
      originalTitle: "The Bear",
      year: 2022,
      country: "US",
      genres: ["Drama", "Comedy"],
      carouselImages: ["https://example.com/bear-1.jpg", "https://example.com/bear-2.jpg"],
      rating: 9.1,
      posterUrl: "https://example.com/bear.jpg",
      summary: "高压成长故事",
      recommendReason: "节奏极好",
      isFeatured: true,
      status: "published",
    },
  );
});

test("chooses uploaded show poster url before the existing form value", () => {
  assert.equal(buildShowPosterUrl("https://example.com/new.jpg", "https://example.com/old.jpg"), "https://example.com/new.jpg");
  assert.equal(buildShowPosterUrl(undefined, " https://example.com/old.jpg "), "https://example.com/old.jpg");
});

test("builds update show payload from form values", () => {
  assert.deepEqual(
    buildUpdateShowPayload({
      name: "Sherlock",
      chineseTitle: "神探夏洛克",
      originalTitle: "Sherlock",
      year: 2010,
      country: "UK",
      genres: ["Mystery"],
      carouselImages: ["https://example.com/sherlock-1.jpg"],
      rating: 9.1,
      posterUrl: "",
      summary: "",
      recommendReason: "",
      isFeatured: false,
      status: "draft",
    }),
    {
      name: "Sherlock",
      chineseTitle: "神探夏洛克",
      originalTitle: "Sherlock",
      year: 2010,
      country: "UK",
      genres: ["Mystery"],
      carouselImages: ["https://example.com/sherlock-1.jpg"],
      rating: 9.1,
      posterUrl: "",
      summary: "",
      recommendReason: "",
      isFeatured: false,
      status: "draft",
    },
  );
});

test("builds imported show payload with normalized local image paths", () => {
  assert.deepEqual(
    buildImportedShowPayload({
      name: "  魔女 ",
      chineseTitle: " 魔女 ",
      originalTitle: " 마녀 ",
      year: 2025,
      country: " KR ",
      genres: [" 悬疑 ", "", "奇幻"],
      rating: 8.1,
      summary: " 神秘爱情故事 ",
      recommendReason: " 氛围很强 ",
      isFeatured: true,
      status: "published",
      localPosterPath: " D:\\谷歌下载内容\\韩剧\\魔女\\poster.jpg ",
      localCarouselPaths: [" D:\\谷歌下载内容\\韩剧\\魔女\\backdrop-1.jpg ", "", "D:\\谷歌下载内容\\韩剧\\魔女\\backdrop-2.jpg "],
    }),
    {
      name: "魔女",
      chineseTitle: "魔女",
      originalTitle: "마녀",
      year: 2025,
      country: "KR",
      genres: ["悬疑", "奇幻"],
      carouselImages: [],
      rating: 8.1,
      posterUrl: "",
      summary: "神秘爱情故事",
      recommendReason: "氛围很强",
      isFeatured: true,
      status: "published",
      localPosterPath: "D:\\谷歌下载内容\\韩剧\\魔女\\poster.jpg",
      localCarouselPaths: [
        "D:\\谷歌下载内容\\韩剧\\魔女\\backdrop-1.jpg",
        "D:\\谷歌下载内容\\韩剧\\魔女\\backdrop-2.jpg",
      ],
    },
  );
});

test("renders carousel image upload inside the show editor modal", () => {
  const source = readFileSync("src/components/admin/ShowManager.tsx", "utf8");

  assert.match(source, /轮播图/);
  assert.match(source, /carouselImages/);
  assert.match(source, /中文标题/);
  assert.match(source, /原标题/);
  assert.match(source, /导入 JSON/);
  assert.match(source, /localPosterPath/);
  assert.match(source, /localCarouselPaths/);
});
