import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildApiTableParams,
  createApiTableRequest,
  normalizeApiTableResult,
} from "../src/components/shared/api-table-core.ts";
import { closeRefModalState, openRefModalState } from "../src/components/shared/ref-modal-core.ts";
import { getToastErrorMessage, getToastNoticeClassName } from "../src/components/shared/toast-core.ts";

test("builds table params with page and limit overriding base params", () => {
  assert.deepEqual(
    buildApiTableParams({ status: "published", page: 9, limit: 99 }, { page: 2, limit: 20 }),
    { status: "published", page: 2, limit: 20 },
  );
});

test("requests a URL api with query params", async () => {
  const requestedUrls: string[] = [];
  const request = createApiTableRequest({
    api: "/api/images",
    fetcher: async (url) => {
      requestedUrls.push(url);
      return { ok: true, json: async () => ({ rows: [{ id: "img-1" }], total: 1 }) };
    },
  });

  const result = await request({ keyword: "logo", page: 1, limit: 10 });

  assert.equal(requestedUrls[0], "/api/images?keyword=logo&page=1&limit=10");
  assert.deepEqual(result, { rows: [{ id: "img-1" }], total: 1 });
});

test("throws readable table request errors from response message", async () => {
  const request = createApiTableRequest({
    api: "/api/admin/images",
    fetcher: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: "登录已失效，请重新登录" }),
    }),
  });

  await assert.rejects(
    () => request({ page: 1, limit: 10 }),
    /登录已失效，请重新登录/,
  );
});

test("requests a function api with merged params", async () => {
  const request = createApiTableRequest({
    api: async (params) => ({ received: params }),
  });

  assert.deepEqual(await request({ page: 3, limit: 30, keyword: "poster" }), {
    received: { page: 3, limit: 30, keyword: "poster" },
  });
});

test("normalizes table response through transform", () => {
  assert.deepEqual(
    normalizeApiTableResult(
      { data: { items: [{ id: "one" }], count: 12 } },
      (response) => ({ list: response.data.items, total: response.data.count }),
    ),
    { list: [{ id: "one" }], total: 12 },
  );
});

test("opens modal state with title and merged data", () => {
  assert.deepEqual(
    openRefModalState<{ source: string; id?: string }>(
      { open: false, title: "", data: { source: "props" } },
      "编辑图片",
      { id: "img-1" },
    ),
    { open: true, title: "编辑图片", data: { source: "props", id: "img-1" } },
  );
});

test("closes modal state without dropping title or data", () => {
  assert.deepEqual(closeRefModalState({ open: true, title: "编辑图片", data: { id: "img-1" } }), {
    open: false,
    title: "编辑图片",
    data: { id: "img-1" },
  });
});

test("normalizes toast error messages with a fallback", () => {
  assert.equal(getToastErrorMessage(new Error("保存失败，请重试"), "操作失败"), "保存失败，请重试");
  assert.equal(getToastErrorMessage("plain failure", "操作失败"), "操作失败");
});

test("builds site styled toast class names by type", () => {
  const classNames = {
    toastError: "toastError_hash",
    toastNotice: "toastNotice_hash",
    toastSuccess: "toastSuccess_hash",
  };

  assert.equal(getToastNoticeClassName("success", classNames), "toastNotice_hash toastSuccess_hash");
  assert.equal(getToastNoticeClassName("error", classNames), "toastNotice_hash toastError_hash");
});

test("renders the global message provider without using an antd app wrapper", () => {
  const source = readFileSync("src/components/shared/GlobalMessageProvider.tsx", "utf8");

  assert.match(source, /message\.useMessage/);
  assert.doesNotMatch(source, /<App\b/);
  assert.doesNotMatch(source, /component=\{false\}/);
});

test("renders quick auth recovery actions near login errors", () => {
  const source = readFileSync("src/components/site/AuthModal.tsx", "utf8");

  assert.match(source, /登录遇到问题？/);
  assert.match(source, /忘记密码/);
  assert.match(source, /去注册/);
});
