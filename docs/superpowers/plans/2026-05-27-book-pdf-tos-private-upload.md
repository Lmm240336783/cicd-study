# Book PDF TOS Private Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保留现有 Supabase `books` 数据表作为业务数据源，把图书 PDF 从 Supabase Storage 切换到 TOS 私有分片上传，并通过预签名访问完成后台预览和前台详情页阅读。

**Architecture:** 业务记录继续落在 Supabase `books` 表，但不再保存长期可访问的公开 PDF URL，而是保存 TOS 对象键和必要元数据。后台编辑页通过 Next.js Route Handler 获取 TOS 临时上传凭证并在浏览器端执行分片上传；前台和后台查看 PDF 时，都先请求站内 Route Handler，再由服务端生成短时预签名地址并重定向到 TOS 私有对象。

**Tech Stack:** Next.js App Router Route Handlers、React 19、Ant Design Upload、Supabase（仅表数据与鉴权）、TOS Browser.js SDK、TOS STS 临时凭证、私有桶预签名访问。

---

## Scope and Assumptions

- 直接按新方案切换，不保留 Supabase Storage 旧 PDF 上传链路的兼容分支。
- 保留 `books` 表这张业务表，但允许新增或替换字段。
- 默认把 TOS 桶设为私有；PDF 访问统一走预签名，不暴露长期公开链接。
- 如果现有 `books.pdf_url` 线上数据必须保留，需要额外补一份数据迁移计划；本计划默认这些旧值可丢弃或可人工重填。
- 关键上传、续传、预签名代码必须带详细中文注释，按“这一步为什么存在、失败时会怎样、后面谁依赖它”写清楚。

## File Map

### Create

- `src/lib/server/tos/config.ts`
  负责读取、校验 TOS 相关环境变量，集中输出 bucket、region、endpoint、STS 角色配置。
- `src/lib/server/tos/sts.ts`
  负责向 TOS/火山云鉴权侧申请浏览器直传所需的短时凭证。
- `src/lib/server/tos/book-pdf.ts`
  负责生成图书 PDF 对象键、生成预签名下载链接、整理上传配置。
- `src/lib/client/tos/book-pdf-multipart-upload.ts`
  负责浏览器端分片上传、失败重试、续传状态恢复；这里必须写详细中文注释。
- `src/app/api/admin/books/upload-session/route.ts`
  后台获取 PDF 上传会话信息：STS、对象键、分片配置。
- `src/app/api/admin/books/[id]/pdf/route.ts`
  后台查看指定图书 PDF，校验管理员会话后重定向到短时预签名 URL。
- `src/app/api/public/books/[id]/pdf/route.ts`
  前台查看已发布图书 PDF，校验发布状态后重定向到短时预签名 URL。
- `tests/book-pdf-tos.test.mts`
  纯函数与静态源码断言测试，覆盖新字段映射、TOS 路由入口、前台/后台 PDF 访问改造。

### Modify

- `.env.example`
  新增 TOS 环境变量样例。
- `package.json`
  新增 TOS SDK 依赖；必要时同步测试命令把新测试文件纳入。
- `src/types/content.ts`
  调整图书模型，保留页面消费用 `pdfUrl`，新增对象键和文件元数据。
- `src/types/forms.ts`
  调整后台图书表单类型，去掉手填 `pdfUrl` 的主路径，改为上传结果字段。
- `src/lib/server/content/records.ts`
  把 `books` 表记录映射到新的图书模型。
- `src/lib/server/content/store.ts`
  为图书读取/写入接入新的 PDF 字段，并为前台/后台访问提供稳定的站内 PDF 路由。
- `src/components/admin/book-manager-core.ts`
  调整图书表单默认值与 payload 生成逻辑。
- `src/components/admin/BookManager.tsx`
  用 TOS 分片上传替换 `/api/admin/books/upload-pdf`；这里的分片上传接线与 UI 状态也要写详细中文注释。
- `src/app/(site)/books/detail/page.tsx`
  详情页预览地址改为站内私有访问路由，不再直接消费公开 URL。
- `src/app/api/public/books/[id]/route.ts`
  如果接口直接返回图书详情，需要保证 `pdfUrl` 是站内私有访问路由，不是长期公开地址。
- `docs/project-directory-structure.md`
  功能完成后补充 TOS 相关客户端/服务端目录职责。

### Delete

- `src/app/api/admin/books/upload-pdf/route.ts`
- `src/lib/server/storage/admin-books.ts`

## Task 1: 定义新数据模型和表字段

**Files:**
- Modify: `src/types/content.ts`
- Modify: `src/types/forms.ts`
- Modify: `src/lib/server/content/records.ts`
- Test: `tests/book-pdf-tos.test.mts`

- [ ] **Step 1: 先写失败测试，锁定新字段和旧字段退出点**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
```

- [ ] **Step 2: 运行新测试，确认它先失败**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/book-pdf-tos.test.mts`

Expected:
- FAIL，提示 `pdfObjectKey` / `pdf_file_name` / `pdf_size_bytes` 尚未出现

- [ ] **Step 3: 设计 `books` 表的新字段，并把 SQL 记录进实施说明**

在 Supabase SQL Editor 里执行这段脚本：

```sql
alter table public.books
  drop column if exists pdf_url,
  add column pdf_object_key text not null default '',
  add column pdf_file_name text not null default '',
  add column pdf_size_bytes bigint not null default 0;

comment on column public.books.pdf_object_key is 'TOS 私有对象键，例如 admin-book-pdfs/<uuid>.pdf';
comment on column public.books.pdf_file_name is '原始文件名，后台展示用';
comment on column public.books.pdf_size_bytes is 'PDF 文件字节数，后台展示与上传校验用';
```

说明：
- 这里直接切掉 `pdf_url`，符合项目“默认不做兼容”的规则。
- 如果线上已有数据不能丢，这一步需要改成“先新增字段，再跑迁移，再删旧字段”的单独计划。

- [ ] **Step 4: 最小改动实现新类型和 record 映射**

目标结构：

```ts
export type BookCollectionItem = {
  id: string;
  title: string;
  coverUrl: string;
  description: string;
  pdfUrl: string;
  pdfObjectKey: string;
  pdfFileName: string;
  pdfSizeBytes: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};

export type BookRecord = {
  id: string;
  title: string;
  cover_url: string;
  description: string | null;
  pdf_object_key: string;
  pdf_file_name: string;
  pdf_size_bytes: number;
  status: ContentStatus | null;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/book-pdf-tos.test.mts`

Expected:
- PASS，断言通过

- [ ] **Step 6: Commit**

```bash
git add src/types/content.ts src/types/forms.ts src/lib/server/content/records.ts tests/book-pdf-tos.test.mts
git commit -m "refactor: replace legacy book pdf url fields with tos metadata"
```

## Task 2: 新增 TOS 服务端配置、STS 和预签名能力

**Files:**
- Create: `src/lib/server/tos/config.ts`
- Create: `src/lib/server/tos/sts.ts`
- Create: `src/lib/server/tos/book-pdf.ts`
- Modify: `.env.example`
- Modify: `package.json`
- Test: `tests/book-pdf-tos.test.mts`

- [ ] **Step 1: 写失败测试，锁定 TOS 配置与路由依赖**

```ts
test("tos server helpers exist for config sts and book pdf signing", () => {
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
  assert.match(packageSource, /tos/);
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/book-pdf-tos.test.mts`

Expected:
- FAIL，提示 TOS helper 文件不存在

- [ ] **Step 3: 补环境变量和 SDK 依赖**

`.env.example` 目标键名：

```env
TOS_REGION=
TOS_BUCKET_NAME=
TOS_ENDPOINT=
TOS_ACCESS_KEY_ID=
TOS_SECRET_ACCESS_KEY=
TOS_STS_ROLE_ARN=
TOS_STS_ROLE_SESSION_NAME=book-pdf-upload
TOS_SIGNED_URL_EXPIRES_SECONDS=900
```

`package.json` 目标依赖：

```json
{
  "dependencies": {
    "@volcengine/tos-sdk": "latest"
  }
}
```

- [ ] **Step 4: 实现服务端配置与签名骨架**

关键导出应至少包含：

```ts
export type TosServerConfig = {
  region: string;
  bucketName: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  stsRoleArn: string;
  stsRoleSessionName: string;
  signedUrlExpiresSeconds: number;
};

export function getTosServerConfig(): TosServerConfig {}

export async function createBookPdfUploadSession(input: {
  fileName: string;
  fileSize: number;
  contentType: string;
}): Promise<{
  objectKey: string;
  multipartChunkSize: number;
  expiresInSeconds: number;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };
}> {}

export async function createBookPdfSignedDownloadUrl(input: {
  objectKey: string;
  fileName: string;
}): Promise<string> {}
```

- [ ] **Step 5: 明确这里的中文注释标准**

这些函数必须写成这种粒度的注释：

```ts
/** 
 * 给浏览器签发一次短时上传会话。
 * 这里不直接把永久 AK/SK 发到前端，而是改发短时凭证，
 * 这样即使浏览器端代码被看到，暴露的权限也会在短时间后自动失效。
 */
```

- [ ] **Step 6: 跑测试确认通过**

Run: `npm test`

Expected:
- PASS，现有测试仍绿
- `tests/book-pdf-tos.test.mts` 新增断言通过

- [ ] **Step 7: Commit**

```bash
git add .env.example package.json src/lib/server/tos tests/book-pdf-tos.test.mts
git commit -m "feat: add tos server config and signing helpers for book pdfs"
```

## Task 3: 改造后台上传入口，改成浏览器直传分片上传

**Files:**
- Create: `src/app/api/admin/books/upload-session/route.ts`
- Create: `src/lib/client/tos/book-pdf-multipart-upload.ts`
- Modify: `src/components/admin/BookManager.tsx`
- Modify: `src/components/admin/book-manager-core.ts`
- Modify: `src/types/forms.ts`
- Test: `tests/book-pdf-tos.test.mts`

- [ ] **Step 1: 写失败测试，锁定新接口和老接口删除**

```ts
test("admin book upload uses tos session route instead of supabase upload-pdf route", () => {
  const managerSource = readFileSync("src/components/admin/BookManager.tsx", "utf8");
  const sessionRouteSource = readFileSync("src/app/api/admin/books/upload-session/route.ts", "utf8");

  assert.match(managerSource, /book-pdf-multipart-upload/);
  assert.match(managerSource, /\/api\/admin\/books\/upload-session/);
  assert.doesNotMatch(managerSource, /\/api\/admin\/books\/upload-pdf/);
  assert.match(sessionRouteSource, /createBookPdfUploadSession/);
});
```

- [ ] **Step 2: 先让测试失败**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/book-pdf-tos.test.mts`

Expected:
- FAIL，缺少 `upload-session` 路由和 multipart client helper

- [ ] **Step 3: 实现后台“拿上传会话”的 Route Handler**

路由目标：

```ts
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const fileSize = typeof body.fileSize === "number" ? body.fileSize : 0;
  const contentType = typeof body.contentType === "string" ? body.contentType : "";

  if (!fileName || fileSize <= 0 || contentType !== "application/pdf") {
    return NextResponse.json({ message: "Invalid PDF upload session payload" }, { status: 400 });
  }

  const data = await createBookPdfUploadSession({ fileName, fileSize, contentType });
  return NextResponse.json({ data });
}
```

- [ ] **Step 4: 浏览器分片上传 helper 必须带详细中文注释**

`src/lib/client/tos/book-pdf-multipart-upload.ts` 至少拆出这些函数：

```ts
export type BookPdfMultipartUploadResult = {
  objectKey: string;
  fileName: string;
  fileSize: number;
};

export async function uploadBookPdfWithMultipart(file: File): Promise<BookPdfMultipartUploadResult> {}

function buildChunkRanges(fileSize: number, chunkSize: number) {}

function readSavedUploadState(fileFingerprint: string) {}

function saveUploadState(fileFingerprint: string, state: SavedUploadState) {}

function clearUploadState(fileFingerprint: string) {}
```

这里的中文注释必须覆盖：
- 为什么要先向站内接口申请 STS
- 为什么要把文件切片
- 为什么要把 `uploadId` 和已完成分片写到 `localStorage`
- 为什么完成后要清理本地续传状态
- 如果最后一步 `completeMultipartUpload` 失败，为什么不能直接假定文件可用

- [ ] **Step 5: 改后台表单，不再把 PDF 地址当可手填主流程**

`BookManager.tsx` 改造目标：
- 上传区仍保留 `Upload.Dragger`
- 选中 PDF 后，保存动作改为调用 `uploadBookPdfWithMultipart(file)`
- 保存图书记录时提交：

```ts
{
  title,
  coverUrl,
  description,
  pdfObjectKey,
  pdfFileName,
  pdfSizeBytes,
  status
}
```

- [ ] **Step 6: 跑测试和类型检查**

Run:
- `npm test`
- `npm run typecheck`

Expected:
- 两个命令都 PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/api/admin/books/upload-session/route.ts src/lib/client/tos src/components/admin/BookManager.tsx src/components/admin/book-manager-core.ts src/types/forms.ts tests/book-pdf-tos.test.mts
git commit -m "feat: switch admin book pdf uploads to tos multipart browser upload"
```

## Task 4: 改造图书读写链路，让页面消费站内私有 PDF 路由

**Files:**
- Modify: `src/lib/server/content/store.ts`
- Modify: `src/lib/server/content/records.ts`
- Modify: `src/types/content.ts`
- Modify: `src/app/api/public/books/[id]/route.ts`
- Test: `tests/book-pdf-tos.test.mts`

- [ ] **Step 1: 写失败测试，锁定页面侧 `pdfUrl` 的新语义**

```ts
test("book store exposes stable internal pdf routes instead of persisted public urls", () => {
  const source = readFileSync("src/lib/server/content/store.ts", "utf8");

  assert.match(source, /\/api\/public\/books\/\$\{id\}\/pdf/);
  assert.match(source, /\/api\/admin\/books\/\$\{id\}\/pdf/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/book-pdf-tos.test.mts`

Expected:
- FAIL，当前 `store.ts` 里还没有内部 PDF 路由

- [ ] **Step 3: 约定 `BookCollectionItem.pdfUrl` 只给页面消费，不再落库存储**

目标做法：

```ts
function buildPublicBookPdfRoute(id: string) {
  return `/api/public/books/${id}/pdf`;
}

function buildAdminBookPdfRoute(id: string) {
  return `/api/admin/books/${id}/pdf`;
}
```

其中：
- 面向前台详情页的 `getPublicBookById()` 返回 public route
- 面向后台管理列表的读取函数返回 admin route

- [ ] **Step 4: 最小实现并通过测试**

Run: `npm test`

Expected:
- PASS，图书详情页和后台列表后续都能拿到稳定站内地址

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/content/store.ts src/lib/server/content/records.ts src/types/content.ts src/app/api/public/books/[id]/route.ts tests/book-pdf-tos.test.mts
git commit -m "refactor: expose stable internal pdf routes for book records"
```

## Task 5: 新增后台/前台私有 PDF 访问路由

**Files:**
- Create: `src/app/api/admin/books/[id]/pdf/route.ts`
- Create: `src/app/api/public/books/[id]/pdf/route.ts`
- Modify: `src/app/(site)/books/detail/page.tsx`
- Modify: `src/components/admin/BookManager.tsx`
- Test: `tests/book-pdf-tos.test.mts`, `tests/public-books-page.test.mts`

- [ ] **Step 1: 写失败测试，锁定两个 PDF 路由和详情页引用**

```ts
test("book pdf access routes exist for both admin and public readers", () => {
  const publicRoute = readFileSync("src/app/api/public/books/[id]/pdf/route.ts", "utf8");
  const adminRoute = readFileSync("src/app/api/admin/books/[id]/pdf/route.ts", "utf8");
  const detailPage = readFileSync("src/app/(site)/books/detail/page.tsx", "utf8");

  assert.match(publicRoute, /createBookPdfSignedDownloadUrl/);
  assert.match(adminRoute, /createBookPdfSignedDownloadUrl/);
  assert.match(detailPage, /\/api\/public\/books\/\$\{book\.id\}\/pdf/);
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/book-pdf-tos.test.mts tests/public-books-page.test.mts`

Expected:
- FAIL，两个路由尚不存在

- [ ] **Step 3: 实现后台管理员访问路由**

目标骨架：

```ts
export async function GET(request: NextRequest, context: RouteContext<"/api/admin/books/[id]/pdf">) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const book = await getAdminBookById(id);
  if (!book) {
    return NextResponse.json({ message: "图书不存在" }, { status: 404 });
  }

  const signedUrl = await createBookPdfSignedDownloadUrl({
    objectKey: book.pdfObjectKey,
    fileName: book.pdfFileName,
  });

  return NextResponse.redirect(signedUrl);
}
```

- [ ] **Step 4: 实现前台已发布图书访问路由**

要求：
- 只允许已发布图书
- 不需要管理员会话
- 未发布或不存在都返回 404，不泄漏草稿状态

- [ ] **Step 5: 改图书详情页和后台 PDF 链接**

页面改造目标：

```tsx
<a href={`/api/public/books/${book.id}/pdf`} target="_blank" rel="noreferrer">
  新窗口打开 PDF
</a>

<iframe src={`/api/public/books/${book.id}/pdf`} title={`${book.title} PDF 预览`} />
```

后台列表改造目标：

```tsx
<a href={`/api/admin/books/${record.id}/pdf`} target="_blank" rel="noreferrer">
  查看 PDF
</a>
```

- [ ] **Step 6: 跑测试与手动验证**

Run:
- `npm test`
- `npm run typecheck`

Manual:
- 后台图书列表点击“查看 PDF”能打开草稿 PDF
- 前台详情页 `iframe` 能预览已发布图书
- 未发布图书前台访问 PDF 路由返回 404

- [ ] **Step 7: Commit**

```bash
git add src/app/api/admin/books/[id]/pdf/route.ts src/app/api/public/books/[id]/pdf/route.ts src/app/(site)/books/detail/page.tsx src/components/admin/BookManager.tsx tests/book-pdf-tos.test.mts tests/public-books-page.test.mts
git commit -m "feat: add signed pdf access routes for admin and public book pages"
```

## Task 6: 删除旧 Supabase PDF 上传链路并收口文档

**Files:**
- Delete: `src/app/api/admin/books/upload-pdf/route.ts`
- Delete: `src/lib/server/storage/admin-books.ts`
- Modify: `src/components/admin/BookManager.tsx`
- Modify: `docs/project-directory-structure.md`
- Modify: `tests/public-books-page.test.mts`
- Modify: `tests/shared-components.test.mts`

- [ ] **Step 1: 写失败测试，锁定旧链路已经退出**

```ts
test("legacy supabase admin book pdf upload route is removed", () => {
  const managerSource = readFileSync("src/components/admin/BookManager.tsx", "utf8");

  assert.doesNotMatch(managerSource, /upload-pdf/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`

Expected:
- FAIL，因为旧字符串仍在

- [ ] **Step 3: 删除文件并清掉 UI 文案中的旧接口提示**

目标文案示例：

```tsx
<p className="text-xs text-slate-500">
  封面上传仍走 Supabase 图片接口，PDF 上传改为 TOS 私有分片上传。
</p>
```

- [ ] **Step 4: 更新目录结构文档**

`docs/project-directory-structure.md` 需要新增：
- `src/lib/server/tos`：服务端 TOS 配置、STS、预签名
- `src/lib/client/tos`：浏览器端图书 PDF 分片上传
- `src/app/api/admin/books/upload-session/route.ts`：后台上传会话接口
- `src/app/api/admin/books/[id]/pdf/route.ts`：后台 PDF 私有访问路由
- `src/app/api/public/books/[id]/pdf/route.ts`：前台 PDF 私有访问路由

- [ ] **Step 5: 跑全量验证**

Run:
- `npm test`
- `npm run typecheck`

Expected:
- 全绿

- [ ] **Step 6: Commit**

```bash
git add docs/project-directory-structure.md src/components/admin/BookManager.tsx tests/public-books-page.test.mts tests/shared-components.test.mts
git rm src/app/api/admin/books/upload-pdf/route.ts src/lib/server/storage/admin-books.ts
git commit -m "chore: remove legacy supabase pdf upload path and document tos flow"
```

## Task 7: 实施完成后的人工验收

**Files:**
- No code changes required

- [ ] **Step 1: 在 Supabase 后台确认 `books` 表结构**

检查：
- `pdf_object_key` 有值
- `pdf_file_name` 有值
- `pdf_size_bytes` 有值

- [ ] **Step 2: 在 TOS 桶里确认对象落地**

检查：
- 对象键位于 `admin-book-pdfs/`
- 桶权限为私有
- 浏览器不能直接永久公开访问

- [ ] **Step 3: 手工验证续传**

操作：
- 选一个 `150MB~250MB` PDF
- 上传过程中刷新页面
- 重新选择同一文件

Expected:
- 客户端能读取续传状态
- 继续上传未完成分片，而不是从 0 重新传

- [ ] **Step 4: 手工验证预签名失效边界**

操作：
- 打开前台图书详情页
- 等待超过 `TOS_SIGNED_URL_EXPIRES_SECONDS`
- 再刷新 iframe 或再次点击“新窗口打开 PDF”

Expected:
- 因为走的是站内中转路由，重新请求时仍能拿到新的预签名 URL

- [ ] **Step 5: 最终汇总并提交**

```bash
git status
git log --oneline -5
```

Expected:
- 工作区干净或只剩用户明确保留的变更
- 最近几条提交按任务拆分清晰

## Self-Review

- 本计划覆盖了新字段、TOS 服务端能力、后台分片上传、前台/后台预签名访问、旧链路删除、文档同步和人工验收。
- 没有使用 `TODO` / `TBD` / “类似任务 N” 这类占位写法。
- 所有涉及实现的步骤都给了明确文件路径、命令或目标代码骨架。
- 默认按项目规则不保留旧 Supabase PDF 上传兼容；若线上旧数据必须保留，应先单开迁移计划。
