import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCreateImagePayload,
  buildImageFormValues,
  buildImageTagOptions,
  buildUpdateImagePayload,
  decorateImageRows,
} from "../src/components/admin/image-manager-core.ts";

test("decorates image rows without adding fake priority fields", () => {
  assert.deepEqual(
    decorateImageRows([
      {
        id: "image-1",
        title: "封面 1",
        description: "",
        imageUrl: "https://example.com/1.jpg",
        tags: [],
        isFeatured: false,
        status: "draft",
        createdAt: "2026-05-08T00:00:00.000Z",
        updatedAt: "2026-05-08T00:00:00.000Z",
      },
      {
        id: "image-2",
        title: "封面 2",
        description: "",
        imageUrl: "https://example.com/2.jpg",
        tags: ["旅行"],
        isFeatured: true,
        status: "published",
        createdAt: "2026-05-08T00:00:00.000Z",
        updatedAt: "2026-05-08T00:00:00.000Z",
      },
    ]),
    [
      {
        id: "image-1",
        title: "封面 1",
        description: "",
        imageUrl: "https://example.com/1.jpg",
        tags: [],
        isFeatured: false,
        status: "draft",
        createdAt: "2026-05-08T00:00:00.000Z",
        updatedAt: "2026-05-08T00:00:00.000Z",
      },
      {
        id: "image-2",
        title: "封面 2",
        description: "",
        imageUrl: "https://example.com/2.jpg",
        tags: ["旅行"],
        isFeatured: true,
        status: "published",
        createdAt: "2026-05-08T00:00:00.000Z",
        updatedAt: "2026-05-08T00:00:00.000Z",
      },
    ],
  );
});

test("builds empty image form defaults", () => {
  assert.deepEqual(buildImageFormValues(), {
    title: "",
    description: "",
    imageUrl: "",
    tags: [],
    isFeatured: false,
    status: "draft",
  });
});

test("builds image form values from a selected row", () => {
  assert.deepEqual(
    buildImageFormValues({
      id: "image-9",
      title: "海边日落",
      description: "",
      imageUrl: "https://example.com/sunset.jpg",
      tags: ["旅行", "自然"],
      isFeatured: true,
      status: "published",
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-08T00:00:00.000Z",
    }),
    {
      title: "海边日落",
      description: "",
      imageUrl: "https://example.com/sunset.jpg",
      tags: ["旅行", "自然"],
      isFeatured: true,
      status: "published",
    },
  );
});

test("builds tag options from managed tags and selected row tags", () => {
  assert.deepEqual(
    buildImageTagOptions(
      [
        { id: "tag-1", name: "旅行", createdAt: "", updatedAt: "" },
        { id: "tag-2", name: "自然", createdAt: "", updatedAt: "" },
      ],
      ["旅行", "粉色"],
    ),
    [
      { value: "旅行", label: "旅行" },
      { value: "自然", label: "自然" },
      { value: "粉色", label: "粉色" },
    ],
  );
});

test("builds create image payload with trimmed text and filtered tags", () => {
  assert.deepEqual(
    buildCreateImagePayload({
      title: "  海边日落  ",
      description: "  暖色氛围  ",
      imageUrl: " https://example.com/sunset.jpg ",
      tags: [" 旅行 ", "", "自然"],
      isFeatured: true,
      status: "published",
    }),
    {
      title: "海边日落",
      description: "暖色氛围",
      imageUrl: "https://example.com/sunset.jpg",
      tags: ["旅行", "自然"],
      isFeatured: true,
      status: "published",
    },
  );
});

test("builds update image payload from form values", () => {
  assert.deepEqual(
    buildUpdateImagePayload({
      title: "粉色公寓外墙",
      description: "",
      imageUrl: "https://example.com/pink.jpg",
      tags: [],
      isFeatured: false,
      status: "draft",
    }),
    {
      title: "粉色公寓外墙",
      description: "",
      imageUrl: "https://example.com/pink.jpg",
      tags: [],
      isFeatured: false,
      status: "draft",
    },
  );
});

test("requestJson falls back to a readable error when the response body is empty", async () => {
  const originalFetch = globalThis.fetch;

  try {
    const fetchCalls: Array<{ input: string; init?: RequestInit }> = [];
    globalThis.fetch = async (input, init) => {
      fetchCalls.push({ input: String(input), init });
      return new Response(null, {
        status: 500,
        statusText: "Internal Server Error",
      });
    };

    const { requestJson } = await import("../src/components/admin/request-json.ts");

    await assert.rejects(
      () => requestJson("/api/admin/image-tags", { method: "POST" }),
      (error: unknown) => {
        assert.equal(error instanceof Error, true);
        assert.equal((error as Error).message, "请求失败");
        return true;
      },
    );

    assert.equal(fetchCalls[0]?.input, "/api/admin/image-tags");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("renders a current image preview inside the image editor modal", () => {
  const source = readFileSync("src/components/admin/ImageManager.tsx", "utf8");

  assert.match(source, /当前图片预览/);
  assert.match(source, /previewUrl/);
});
