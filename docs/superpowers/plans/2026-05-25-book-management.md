# Book Management Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new books module with admin-side CRUD and PDF upload, plus public `/books` and `/books/[id]` pages that render published books and embed the full PDF in the detail page.

**Architecture:** Keep the new feature inside the existing App Router structure and mirror the project's current content-module pattern: shared content types and Supabase record mappers, server-only `store.ts` readers/writers, thin Route Handlers, a client-side Ant Design admin manager, and server-rendered public pages that call `connection()` before reading content. Reuse the existing image upload path for book covers, add one dedicated PDF upload helper and route, and keep all book-specific normalization logic in small pure helper files so the route validation remains testable.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Ant Design 6, Tailwind + existing SCSS module styles, Supabase Storage, Node test runner with `tsx`

---

## File Map

### Create

- `src/components/admin/book-manager-core.ts`
  - Normalize admin book form values and request payloads.
- `src/components/admin/BookManager.tsx`
  - Render the admin books table, modal form, cover upload, and PDF upload flow.
- `src/app/(admin)/admin/books/page.tsx`
  - Mount the new `BookManager` screen.
- `src/lib/server/content/book-payloads.ts`
  - Hold pure create/update payload normalization helpers used by the admin routes.
- `src/lib/server/storage/admin-books.ts`
  - Upload PDF binaries to Supabase Storage and return public URLs.
- `src/app/api/admin/books/route.ts`
  - Admin list/create route for books.
- `src/app/api/admin/books/[id]/route.ts`
  - Admin update/delete route for books.
- `src/app/api/admin/books/upload-pdf/route.ts`
  - Admin PDF upload route.
- `src/app/api/public/books/route.ts`
  - Public published-book list route.
- `src/app/api/public/books/[id]/route.ts`
  - Public single-book detail route.
- `src/app/(site)/books/page.tsx`
  - Public list page for published books.
- `src/app/(site)/books/[id]/page.tsx`
  - Public detail page with embedded PDF.
- `tests/book-manager-core.test.mts`
  - Unit and source-assertion coverage for the admin book manager helpers and UI markers.
- `tests/book-payloads.test.mts`
  - Unit coverage for admin create/update payload normalization.
- `tests/public-books-page.test.mts`
  - Source-assertion coverage for the public books list/detail pages.

### Modify

- `package.json`
  - Add the new test files to the hard-coded `npm test` list.
- `src/types/content.ts`
  - Add `BookCollectionItem`.
- `src/types/forms.ts`
  - Add `CreateBookPayload` and `UpdateBookPayload`.
- `src/lib/server/content/fallback.ts`
  - Add `fallbackBooks` so the feature behaves consistently when the `books` table is missing.
- `src/lib/server/content/records.ts`
  - Add `BookRecord` plus book insert/update/read mappers.
- `src/lib/server/content/store.ts`
  - Add book read/write helpers for public and admin consumers.
- `src/lib/admin/navigation.tsx`
  - Add the `/admin/books` navigation entry.
- `tests/content-records.test.mts`
  - Add coverage for `BookRecord` and `CreateBookPayload` mapping.
- `tests/admin-navigation.test.mts`
  - Assert `/admin/books` route matching.
- `docs/supabase-content-schema.sql`
  - Add the `books` table, trigger, and indexes.
- `docs/project-directory-structure.md`
  - Sync the new client/server book paths and responsibilities.

### Verify Only

- `src/app/api/admin/images/upload/route.ts`
  - Reuse the existing cover upload route instead of creating a second cover-upload API.
- `src/app/(site)/images/[id]/page.tsx`
  - Keep the existing `await connection()` pattern in mind when building the new public pages.

### Task 1: Lock the shared book data model with failing tests

**Files:**
- Modify: `tests/content-records.test.mts`
- Modify: `src/types/content.ts`
- Modify: `src/types/forms.ts`
- Modify: `src/lib/server/content/fallback.ts`
- Modify: `src/lib/server/content/records.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing record-mapping tests for books**

```ts
test("maps Supabase book records to public book items", () => {
  assert.deepEqual(
    bookRecordToItem({
      id: "book-1",
      title: "深入浅出 CI/CD",
      cover_url: "https://example.com/book-cover.jpg",
      description: "从流水线到部署的入门书。",
      pdf_url: "https://example.com/book.pdf",
      status: "published",
      created_at: "2026-05-08T00:00:00.000Z",
      updated_at: "2026-05-09T00:00:00.000Z",
    }),
    {
      id: "book-1",
      title: "深入浅出 CI/CD",
      coverUrl: "https://example.com/book-cover.jpg",
      description: "从流水线到部署的入门书。",
      pdfUrl: "https://example.com/book.pdf",
      status: "published",
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-09T00:00:00.000Z",
    },
  );
});

test("maps book create payloads to Supabase insert records", () => {
  assert.deepEqual(
    bookPayloadToInsertRecord({
      title: "深入浅出 CI/CD",
      coverUrl: "https://example.com/book-cover.jpg",
      description: "从流水线到部署的入门书。",
      pdfUrl: "https://example.com/book.pdf",
      status: "published",
    }),
    {
      title: "深入浅出 CI/CD",
      cover_url: "https://example.com/book-cover.jpg",
      description: "从流水线到部署的入门书。",
      pdf_url: "https://example.com/book.pdf",
      status: "published",
    },
  );
});
```

- [ ] **Step 2: Run the targeted records test to verify it fails**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/content-records.test.mts`
Expected: FAIL because `bookRecordToItem` and `bookPayloadToInsertRecord` do not exist yet.

- [ ] **Step 3: Add the shared book types and fallback data**

```ts
// src/types/content.ts
export type BookCollectionItem = {
  id: string;
  title: string;
  coverUrl: string;
  description: string;
  pdfUrl: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};

// src/types/forms.ts
export type CreateBookPayload = {
  title: string;
  coverUrl: string;
  description?: string;
  pdfUrl: string;
  status?: "draft" | "published";
};

export type UpdateBookPayload = Partial<CreateBookPayload>;
```

```ts
// src/lib/server/content/fallback.ts
export const fallbackBooks: BookCollectionItem[] = [
  {
    id: "book-ci-cd-guide",
    title: "深入浅出 CI/CD",
    coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1000&q=80&auto=format&fit=crop",
    description: "把构建、测试和部署串起来的入门读物。",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    status: "published",
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
  },
];
```

- [ ] **Step 4: Add the book record mappers and extend the test script**

```ts
// src/lib/server/content/records.ts
export type BookRecord = {
  id: string;
  title: string;
  cover_url: string | null;
  description: string | null;
  pdf_url: string | null;
  status: ContentStatus | null;
  created_at: string;
  updated_at: string;
};

type BookWriteRecord = {
  title?: string;
  cover_url?: string;
  description?: string;
  pdf_url?: string;
  status?: ContentStatus;
};

export function bookRecordToItem(record: BookRecord): BookCollectionItem {
  return {
    id: record.id,
    title: record.title,
    coverUrl: record.cover_url ?? "",
    description: record.description ?? "",
    pdfUrl: record.pdf_url ?? "",
    status: record.status ?? "draft",
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export function bookPayloadToInsertRecord(payload: CreateBookPayload): BookWriteRecord {
  return {
    title: payload.title,
    cover_url: payload.coverUrl,
    description: payload.description ?? "",
    pdf_url: payload.pdfUrl,
    status: payload.status ?? "draft",
  };
}

export function bookPayloadToUpdateRecord(payload: UpdateBookPayload) {
  return compactRecord<BookWriteRecord>({
    title: payload.title,
    cover_url: payload.coverUrl,
    description: payload.description,
    pdf_url: payload.pdfUrl,
    status: payload.status,
  });
}
```

```json
// package.json
"test": "npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/auth-session.test.mts tests/content-records.test.mts tests/admin-dashboard-core.test.mts tests/admin-navigation.test.mts tests/shared-components.test.mts tests/image-manager-core.test.mts tests/show-manager-core.test.mts tests/book-manager-core.test.mts tests/book-payloads.test.mts tests/public-shows-page.test.mts tests/public-music-page.test.mts tests/public-books-page.test.mts"
```

- [ ] **Step 5: Run the targeted records test again**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/content-records.test.mts`
Expected: PASS with the new book record mapping assertions green alongside the existing content-record tests.

- [ ] **Step 6: Commit the shared data-model milestone**

```bash
git add package.json src/types/content.ts src/types/forms.ts src/lib/server/content/fallback.ts src/lib/server/content/records.ts tests/content-records.test.mts
git commit -m "feat: add book content types and record mapping"
```

### Task 2: Build the admin book manager helpers and screen shell

**Files:**
- Create: `tests/book-manager-core.test.mts`
- Create: `src/components/admin/book-manager-core.ts`
- Create: `src/components/admin/BookManager.tsx`
- Create: `src/app/(admin)/admin/books/page.tsx`
- Modify: `src/lib/admin/navigation.tsx`
- Modify: `tests/admin-navigation.test.mts`

- [ ] **Step 1: Write the failing admin helper and source-assertion tests**

```ts
test("builds empty book form defaults", () => {
  assert.deepEqual(buildBookFormValues(), {
    title: "",
    coverUrl: "",
    description: "",
    pdfUrl: "",
    status: "draft",
  });
});

test("builds create book payload with trimmed text", () => {
  assert.deepEqual(
    buildCreateBookPayload({
      title: "  Docker 入门 ",
      coverUrl: " https://example.com/docker-cover.jpg ",
      description: "  从镜像到容器 ",
      pdfUrl: " https://example.com/docker.pdf ",
      status: "published",
    }),
    {
      title: "Docker 入门",
      coverUrl: "https://example.com/docker-cover.jpg",
      description: "从镜像到容器",
      pdfUrl: "https://example.com/docker.pdf",
      status: "published",
    },
  );
});

test("renders the admin book manager pdf upload controls", () => {
  const source = readFileSync("src/components/admin/BookManager.tsx", "utf8");

  assert.match(source, /图书管理/);
  assert.match(source, /上传 PDF/);
  assert.match(source, /\/api\/admin\/books\/upload-pdf/);
  assert.match(source, /当前 PDF/);
});
```

```ts
// tests/admin-navigation.test.mts
assert.equal(findRouteByPath("/admin/books")?.key, "admin-books");
assert.equal(findRouteByPath("/admin/books/edit")?.key, "admin-books");
```

- [ ] **Step 2: Run the targeted admin tests to verify they fail**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/book-manager-core.test.mts tests/admin-navigation.test.mts`
Expected: FAIL because `book-manager-core.ts`, `BookManager.tsx`, and the `admin-books` route key do not exist yet.

- [ ] **Step 3: Implement the pure admin helper module**

```ts
// src/components/admin/book-manager-core.ts
import type { BookCollectionItem, ContentStatus, CreateBookPayload, UpdateBookPayload } from "@/types";

export type BookManagerFormValues = {
  title: string;
  coverUrl: string;
  description: string;
  pdfUrl: string;
  status: ContentStatus;
};

export function buildBookFormValues(book?: BookCollectionItem | null): BookManagerFormValues {
  if (!book) {
    return {
      title: "",
      coverUrl: "",
      description: "",
      pdfUrl: "",
      status: "draft",
    };
  }

  return {
    title: book.title,
    coverUrl: book.coverUrl,
    description: book.description,
    pdfUrl: book.pdfUrl,
    status: book.status,
  };
}

export function buildCreateBookPayload(values: BookManagerFormValues): CreateBookPayload {
  return {
    title: values.title.trim(),
    coverUrl: values.coverUrl.trim(),
    description: values.description.trim(),
    pdfUrl: values.pdfUrl.trim(),
    status: values.status,
  };
}

export function buildUpdateBookPayload(values: BookManagerFormValues): UpdateBookPayload {
  return buildCreateBookPayload(values);
}
```

- [ ] **Step 4: Add the admin page shell, navigation entry, and the manager UI**

```tsx
// src/app/(admin)/admin/books/page.tsx
import { BookManager } from "@/components/admin/BookManager";

/** 渲染后台图书管理页面。 */
export default function AdminBooksPage() {
  return <BookManager />;
}
```

```tsx
// src/components/admin/BookManager.tsx
const currentPdfUrl = form.getFieldValue("pdfUrl") as string;

<Form.Item label="上传 PDF" className="mb-5">
  <Upload.Dragger
    accept=".pdf,application/pdf"
    beforeUpload={() => false}
    fileList={pdfFileList}
    maxCount={1}
    multiple={false}
    onChange={({ fileList: nextFileList }) => {
      setPdfFileList(nextFileList.slice(-1));
    }}
  >
    <div className="py-5">
      <p className="text-sm font-medium text-slate-900">点击或拖拽 PDF 到此处</p>
      <p className="mt-1 text-xs text-slate-500">保存时会上传到 /api/admin/books/upload-pdf。</p>
    </div>
  </Upload.Dragger>
</Form.Item>

{currentPdfUrl ? (
  <a href={currentPdfUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#6d48d7]">
    当前 PDF
  </a>
) : null}
```

```tsx
// src/lib/admin/navigation.tsx
{
  key: "books",
  label: "图书馆藏",
  icon: <IconReport className="h-4 w-4" />,
  routes: [
    {
      key: "admin-books",
      path: "/admin/books",
      label: "图书管理",
      description: "管理图书的新增、编辑、删除、PDF 上传和发布状态。",
    },
  ],
}
```

- [ ] **Step 5: Run the admin helper and navigation tests again**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/book-manager-core.test.mts tests/admin-navigation.test.mts`
Expected: PASS with both the new helper assertions and the `/admin/books` route-matching assertions green.

- [ ] **Step 6: Commit the admin UI shell milestone**

```bash
git add src/components/admin/book-manager-core.ts src/components/admin/BookManager.tsx src/app/(admin)/admin/books/page.tsx src/lib/admin/navigation.tsx tests/book-manager-core.test.mts tests/admin-navigation.test.mts
git commit -m "feat: add admin books manager shell"
```

### Task 3: Add book payload validation, PDF storage, store methods, and admin routes

**Files:**
- Create: `tests/book-payloads.test.mts`
- Create: `src/lib/server/content/book-payloads.ts`
- Create: `src/lib/server/storage/admin-books.ts`
- Modify: `src/lib/server/content/store.ts`
- Create: `src/app/api/admin/books/route.ts`
- Create: `src/app/api/admin/books/[id]/route.ts`
- Create: `src/app/api/admin/books/upload-pdf/route.ts`
- Modify: `docs/supabase-content-schema.sql`

- [ ] **Step 1: Write the failing admin payload-normalization tests**

```ts
test("normalizes create book payloads and trims user input", () => {
  assert.deepEqual(
    normalizeCreateBookPayload({
      title: "  持续交付实战 ",
      coverUrl: " https://example.com/cd-cover.jpg ",
      description: "  团队交付实践 ",
      pdfUrl: " https://example.com/cd.pdf ",
      status: "published",
    }),
    {
      title: "持续交付实战",
      coverUrl: "https://example.com/cd-cover.jpg",
      description: "团队交付实践",
      pdfUrl: "https://example.com/cd.pdf",
      status: "published",
    },
  );
});

test("rejects invalid create and update book payloads", () => {
  assert.equal(normalizeCreateBookPayload({ title: "", coverUrl: "", pdfUrl: "" }), null);
  assert.equal(normalizeUpdateBookPayload({ title: "   " }), null);
  assert.equal(normalizeUpdateBookPayload({ pdfUrl: "   " }), null);
});
```

- [ ] **Step 2: Run the targeted payload test to verify it fails**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/book-payloads.test.mts`
Expected: FAIL because `normalizeCreateBookPayload` and `normalizeUpdateBookPayload` do not exist yet.

- [ ] **Step 3: Implement the pure book payload helpers**

```ts
// src/lib/server/content/book-payloads.ts
import type { CreateBookPayload, UpdateBookPayload } from "@/types";

export function normalizeCreateBookPayload(data: Partial<CreateBookPayload>): CreateBookPayload | null {
  if (typeof data.title !== "string" || data.title.trim() === "") {
    return null;
  }
  if (typeof data.coverUrl !== "string" || data.coverUrl.trim() === "") {
    return null;
  }
  if (typeof data.pdfUrl !== "string" || data.pdfUrl.trim() === "") {
    return null;
  }

  return {
    title: data.title.trim(),
    coverUrl: data.coverUrl.trim(),
    description: typeof data.description === "string" ? data.description.trim() : "",
    pdfUrl: data.pdfUrl.trim(),
    status: data.status === "published" ? "published" : "draft",
  };
}

export function normalizeUpdateBookPayload(data: Partial<UpdateBookPayload>): UpdateBookPayload | null {
  if (data.title != null && (typeof data.title !== "string" || data.title.trim() === "")) {
    return null;
  }
  if (data.coverUrl != null && (typeof data.coverUrl !== "string" || data.coverUrl.trim() === "")) {
    return null;
  }
  if (data.pdfUrl != null && (typeof data.pdfUrl !== "string" || data.pdfUrl.trim() === "")) {
    return null;
  }

  return {
    title: typeof data.title === "string" ? data.title.trim() : undefined,
    coverUrl: typeof data.coverUrl === "string" ? data.coverUrl.trim() : undefined,
    description: typeof data.description === "string" ? data.description.trim() : undefined,
    pdfUrl: typeof data.pdfUrl === "string" ? data.pdfUrl.trim() : undefined,
    status: data.status === "draft" || data.status === "published" ? data.status : undefined,
  };
}
```

- [ ] **Step 4: Add the PDF storage helper**

```ts
// src/lib/server/storage/admin-books.ts
import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/server/supabase/admin";

const bucketName = process.env.SUPABASE_STORAGE_BUCKET;

export async function uploadAdminPdfBinary({
  bytes,
  contentType,
  filename,
}: {
  bytes: Buffer;
  contentType?: string;
  filename: string;
}) {
  if (!bucketName) {
    throw new Error("Missing SUPABASE_STORAGE_BUCKET");
  }

  if (contentType !== "application/pdf" && !filename.toLowerCase().endsWith(".pdf")) {
    throw new Error("Invalid PDF content type");
  }

  const objectPath = `admin-book-pdfs/${randomUUID()}.pdf`;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucketName).upload(objectPath, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
  return { path: objectPath, url: data.publicUrl };
}
```

- [ ] **Step 5: Extend the store and schema for books**

```ts
// src/lib/server/content/store.ts
export async function listPublicBooks(): Promise<BookCollectionItem[]> {
  const { data, error } = await getContentClient()
    .from("books")
    .select("*")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (isMissingContentTableError(error)) {
    return sortByUpdatedAtDesc(fallbackBooks).filter((item) => item.status === "published");
  }

  assertNoSupabaseError(error, "读取公开图书列表");
  return ((data ?? []) as BookRecord[]).map(bookRecordToItem);
}

export async function getPublicBookById(id: string): Promise<BookCollectionItem | null> {
  const { data, error } = await getContentClient()
    .from("books")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (isMissingContentTableError(error)) {
    return fallbackBooks.find((item) => item.id === id && item.status === "published") ?? null;
  }

  assertNoSupabaseError(error, "读取图书详情");
  return data ? bookRecordToItem(data as BookRecord) : null;
}

export async function listAdminBooks(): Promise<BookCollectionItem[]> {
  const { data, error } = await getContentClient().from("books").select("*").order("updated_at", {
    ascending: false,
  });

  if (isMissingContentTableError(error)) {
    return sortByUpdatedAtDesc(fallbackBooks);
  }

  assertNoSupabaseError(error, "读取后台图书列表");
  return ((data ?? []) as BookRecord[]).map(bookRecordToItem);
}

export async function createBook(payload: CreateBookPayload): Promise<BookCollectionItem> {
  const { data, error } = await getContentClient()
    .from("books")
    .insert(bookPayloadToInsertRecord(payload))
    .select("*")
    .single();

  assertNoSupabaseError(error, "创建图书");
  return bookRecordToItem(data as BookRecord);
}

export async function updateBookById(id: string, payload: UpdateBookPayload): Promise<BookCollectionItem | null> {
  const { data, error } = await getContentClient()
    .from("books")
    .update(bookPayloadToUpdateRecord(payload))
    .eq("id", id)
    .select("*")
    .maybeSingle();

  assertNoSupabaseError(error, "更新图书");
  return data ? bookRecordToItem(data as BookRecord) : null;
}

export async function deleteBookById(id: string) {
  const { data, error } = await getContentClient().from("books").delete().eq("id", id).select("id").maybeSingle();

  assertNoSupabaseError(error, "删除图书");
  return Boolean(data);
}
```

```sql
-- docs/supabase-content-schema.sql
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cover_url text not null default '',
  description text not null default '',
  pdf_url text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
  before update on public.books
  for each row
  execute function public.set_updated_at();

create index if not exists books_status_updated_at_idx on public.books (status, updated_at desc);
```

- [ ] **Step 6: Add the admin books CRUD routes and PDF upload route**

```ts
// src/app/api/admin/books/route.ts
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    return NextResponse.json({ data: await listAdminBooks() });
  } catch (error) {
    return createContentApiErrorResponse(error, "读取后台图书列表失败", "admin/books#get");
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const payload = normalizeCreateBookPayload((await request.json()) as Partial<CreateBookPayload>);
  if (!payload) {
    return NextResponse.json({ message: "Invalid book payload" }, { status: 400 });
  }

  try {
    const created = await createBook(payload);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return createContentApiErrorResponse(error, "创建图书失败", "admin/books#post");
  }
}
```

```ts
// src/app/api/admin/books/[id]/route.ts
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const payload = normalizeUpdateBookPayload((await request.json()) as Partial<UpdateBookPayload>);
  if (!payload) {
    return NextResponse.json({ message: "Invalid book payload" }, { status: 400 });
  }

  try {
    const updated = await updateBookById(id, payload);
    if (!updated) {
      return NextResponse.json({ message: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return createContentApiErrorResponse(error, "更新图书失败", "admin/books/[id]#patch");
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  try {
    const deleted = await deleteBookById(id);
    if (!deleted) {
      return NextResponse.json({ message: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return createContentApiErrorResponse(error, "删除图书失败", "admin/books/[id]#delete");
  }
}
```

```ts
// src/app/api/admin/books/upload-pdf/route.ts
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.type !== "application/pdf") {
      return NextResponse.json({ message: "Invalid PDF file" }, { status: 400 });
    }

    const data = await uploadAdminPdfBinary({
      bytes: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      filename: file.name,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return createContentApiErrorResponse(error, "上传 PDF 失败", "admin/books/upload-pdf#post");
  }
}
```

- [ ] **Step 7: Run the targeted payload tests and typecheck**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/book-payloads.test.mts`
Expected: PASS with the new create/update validation rules green.

Run: `npm run typecheck`
Expected: PASS with the new store methods and route handlers typed cleanly.

- [ ] **Step 8: Commit the server books milestone**

```bash
git add src/lib/server/content/book-payloads.ts src/lib/server/storage/admin-books.ts src/lib/server/content/store.ts src/app/api/admin/books/route.ts src/app/api/admin/books/[id]/route.ts src/app/api/admin/books/upload-pdf/route.ts docs/supabase-content-schema.sql tests/book-payloads.test.mts
git commit -m "feat: add admin books api and pdf uploads"
```

### Task 4: Build the public books API and site pages

**Files:**
- Create: `tests/public-books-page.test.mts`
- Create: `src/app/api/public/books/route.ts`
- Create: `src/app/api/public/books/[id]/route.ts`
- Create: `src/app/(site)/books/page.tsx`
- Create: `src/app/(site)/books/[id]/page.tsx`

- [ ] **Step 1: Write the failing source-assertion tests for the public books pages**

```ts
test("public books list cards link to public book detail pages", () => {
  const source = readFileSync("src/app/(site)/books/page.tsx", "utf8");

  assert.match(source, /await connection\\(\\)/);
  assert.match(source, /listPublicBooks/);
  assert.match(source, /href=\\{`\\/books\\/\\$\\{item\\.id\\}`\\}/);
  assert.match(source, /已收录 \\{books\\.length\\} 本图书/);
});

test("public book detail page embeds the pdf and exposes a direct-open link", () => {
  const source = readFileSync("src/app/(site)/books/[id]/page.tsx", "utf8");

  assert.match(source, /await connection\\(\\)/);
  assert.match(source, /notFound\\(\\)/);
  assert.match(source, /iframe/);
  assert.match(source, /src=\\{book\\.pdfUrl\\}/);
  assert.match(source, /新窗口打开 PDF/);
});
```

- [ ] **Step 2: Run the targeted public-books test to verify it fails**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/public-books-page.test.mts`
Expected: FAIL because the public books pages and routes do not exist yet.

- [ ] **Step 3: Add the public books API routes**

```ts
// src/app/api/public/books/route.ts
import { NextResponse } from "next/server";
import { listPublicBooks } from "@/lib/server/content/store";

/** 返回公开图书列表接口：只返回已发布图书。 */
export async function GET() {
  return NextResponse.json({ data: await listPublicBooks() });
}
```

```ts
// src/app/api/public/books/[id]/route.ts
import { NextResponse } from "next/server";
import { getPublicBookById } from "@/lib/server/content/store";

type BookRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/** 返回公开图书详情。 */
export async function GET(_: Request, { params }: BookRouteContext) {
  const { id } = await params;
  const book = await getPublicBookById(id);

  if (!book) {
    return NextResponse.json({ message: "图书不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: book });
}
```

- [ ] **Step 4: Implement the public books list page**

```tsx
// src/app/(site)/books/page.tsx
import Link from "next/link";
import { connection } from "next/server";
import { listPublicBooks } from "@/lib/server/content/store";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";

/** 渲染前台图书全量列表页面。 */
export default async function PublicBooksPage() {
  await connection();

  const books = await listPublicBooks();

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.surfacePanel, "overflow-hidden rounded-[30px] p-3 md:p-4")}>
        <header className={cn(styles.listHeader, "rounded-[22px] px-5 py-4")}>
          <h1 className="text-3xl font-black text-slate-900">图书馆藏</h1>
          <div className={cn(styles.countPill, "px-4 py-2 text-xs")}>已收录 {books.length} 本图书</div>
        </header>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {books.map((item) => (
            <Link key={item.id} href={`/books/${item.id}`} className={cn(styles.shelfCard, "group block overflow-hidden rounded-[16px] bg-[#fff9e8]")}>
              <div
                className={cn(styles.mediaCardPlain, "h-[264px] w-full bg-cover bg-center bg-no-repeat transition duration-300 group-hover:scale-[1.02]")}
                style={{
                  backgroundImage: item.coverUrl
                    ? `linear-gradient(180deg, rgba(20, 18, 4, 0.08), rgba(20, 18, 4, 0.34)), url("${item.coverUrl}")`
                    : "linear-gradient(135deg, #ffe6a8 0%, #ffd169 46%, #ffb6d7 100%)",
                }}
              />
              <div className="space-y-2 p-3">
                <h2 className="font-semibold text-slate-900">{item.title}</h2>
                <p className="line-clamp-3 text-sm text-slate-600">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Implement the public book detail page with embedded PDF**

```tsx
// src/app/(site)/books/[id]/page.tsx
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import { getPublicBookById } from "@/lib/server/content/store";

type BookDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

/** 渲染前台图书详情页。 */
export default async function BookDetailPage({ params }: BookDetailPageProps) {
  await connection();

  const { id } = await params;
  const book = await getPublicBookById(id);

  if (!book) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.detailShell, "overflow-hidden rounded-[30px] p-3 md:p-5")}>
        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className={cn(styles.detailInfoPanel, "rounded-[26px] p-5 md:p-7")}>
            <Link href="/books" className="inline-flex rounded-full bg-[#fff5ca] px-4 py-2 text-sm font-black text-[#795c19]">
              ← 返回图书馆藏
            </Link>
            <h1 className="mt-6 text-[2.5rem] font-black leading-[1.04] text-slate-950">{book.title}</h1>
            <p className="mt-4 text-base leading-8 text-slate-700">{book.description}</p>
            <a href={book.pdfUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-full bg-[#111827] px-5 py-3 text-sm font-bold text-white">
              新窗口打开 PDF
            </a>
          </aside>

          <section className="rounded-[26px] bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <iframe src={book.pdfUrl} title={`${book.title} PDF`} className="h-[78vh] w-full rounded-[20px] border-0 bg-slate-50" />
            <p className="mt-3 text-xs font-semibold text-slate-500">
              如果预览没有显示，请使用上方按钮在新窗口打开 PDF。
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Run the public-books test again**

Run: `npx --yes tsx@3.14.0 --require ./tests/setup-web-api.cjs --test tests/public-books-page.test.mts`
Expected: PASS with the new list/detail route markers and embedded PDF assertions green.

- [ ] **Step 7: Commit the public books milestone**

```bash
git add src/app/api/public/books/route.ts src/app/api/public/books/[id]/route.ts src/app/(site)/books/page.tsx src/app/(site)/books/[id]/page.tsx tests/public-books-page.test.mts
git commit -m "feat: add public books pages"
```

### Task 5: Sync project docs and run final verification

**Files:**
- Modify: `docs/project-directory-structure.md`
- Verify: `package.json`
- Verify: `src/components/admin/BookManager.tsx`
- Verify: `src/lib/server/content/store.ts`
- Verify: `src/app/(site)/books/page.tsx`
- Verify: `src/app/(site)/books/[id]/page.tsx`
- Verify: `tests/book-manager-core.test.mts`
- Verify: `tests/book-payloads.test.mts`
- Verify: `tests/public-books-page.test.mts`

- [ ] **Step 1: Update the project directory structure document**

````md
## 概览

```text
src/
├─ app/
│  ├─ (site)/
│  │  ├─ books/
│  ├─ (admin)/
│  │  ├─ admin/
│  │  │  ├─ books/
│  └─ api/
│     ├─ admin/
│     │  ├─ books/
│     └─ public/
│        ├─ books/
├─ components/
│  ├─ admin/
│  │  ├─ BookManager.tsx
├─ lib/
│  ├─ server/
│  │  ├─ content/
│  │  ├─ storage/
```

- `src/app/(site)/books`：前台图书列表与详情页。
- `src/app/(admin)/admin/books`：后台图书管理页。
- `src/app/api/admin/books`：图书后台 CRUD 与 PDF 上传接口。
- `src/app/api/public/books`：公开图书列表与详情接口。
````

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS with the newly added book tests included in the hard-coded list.

- [ ] **Step 3: Run TypeScript verification**

Run: `npm run typecheck`
Expected: PASS with no type errors across the new book feature files.

- [ ] **Step 4: Re-read the changed Chinese files with UTF-8**

Run:

```powershell
Get-Content -LiteralPath 'E:\学习\cicd-study\docs\project-directory-structure.md' -Encoding UTF8
Get-Content -LiteralPath 'E:\学习\cicd-study\src\components\admin\BookManager.tsx' -Encoding UTF8
Get-Content -LiteralPath 'E:\学习\cicd-study\src\app\(site)\books\page.tsx' -Encoding UTF8
Get-Content -LiteralPath 'E:\学习\cicd-study\src\app\(site)\books\[id]\page.tsx' -Encoding UTF8
```

Expected: readable Chinese text with no mojibake.

- [ ] **Step 5: Commit the final integration and docs sync**

```bash
git add docs/project-directory-structure.md package.json src/components/admin/BookManager.tsx src/lib/server/content/store.ts src/app/(site)/books/page.tsx src/app/(site)/books/[id]/page.tsx tests/book-manager-core.test.mts tests/book-payloads.test.mts tests/public-books-page.test.mts
git commit -m "feat: ship book management module"
```

- [ ] **Step 6: Record the verification summary**

```text
Verified with npm test and npm run typecheck.
Re-read key Chinese files with UTF-8 after edits.
Lint was not required by the feature spec, so completion is gated on tests and typecheck.
```
