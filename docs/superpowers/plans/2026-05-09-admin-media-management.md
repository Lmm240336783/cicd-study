# Admin Media Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect admin image mutations and uploads to real APIs, remove fake image priority, and migrate admin show management to the shared table and modal pattern.

**Architecture:** Keep browser components in `src/components/admin`, with pure data-shaping helpers in sibling core files covered by node tests. Keep Supabase secret usage inside Route Handlers and server helpers; the client only calls same-origin admin APIs.

**Tech Stack:** Next.js 16 App Router Route Handlers, React 19 client components, antd 6, Supabase Storage, TypeScript strict mode, Node built-in test runner.

---

### Task 1: Helper Tests And Data Mapping

**Files:**
- Modify: `tests/image-manager-core.test.mts`
- Create: `tests/show-manager-core.test.mts`
- Modify: `src/components/admin/image-manager-core.ts`
- Create: `src/components/admin/show-manager-core.ts`

- [ ] Replace fake image priority expectations with form defaults and create/update payload behavior.
- [ ] Add show form defaults and create/update payload tests.
- [ ] Run focused tests and confirm the new tests fail before implementation.
- [ ] Implement the helper functions needed by the tests.
- [ ] Run focused tests and confirm they pass.

### Task 2: Image Upload And CRUD UI

**Files:**
- Create: `src/app/api/admin/images/upload/route.ts`
- Modify: `.env.example`
- Modify: `src/components/admin/ImageManager.tsx`

- [ ] Add a protected upload Route Handler that accepts one image file through `FormData`.
- [ ] Upload to Supabase Storage using the admin client and return a public URL.
- [ ] Wire the image modal form to upload selected files before create/update.
- [ ] Call `POST /api/admin/images`, `PATCH /api/admin/images/[id]`, and `DELETE /api/admin/images/[id]`.
- [ ] Replace priority UI with real fields: status, featured state, and updated time.

### Task 3: Show Manager Migration

**Files:**
- Create: `src/components/admin/ShowManager.tsx`
- Modify: `src/app/(admin)/admin/shows/page.tsx`
- Modify: `package.json`

- [ ] Build the show manager with `ApiTable`, `RefModal`, antd form controls, edit, create, and delete flows.
- [ ] Use existing show admin APIs for create, update, and delete.
- [ ] Add the show core test file to `npm run test`.

### Task 4: Verification

**Files:**
- Read: changed files with Chinese text

- [ ] Run `node --test --experimental-strip-types tests/image-manager-core.test.mts tests/show-manager-core.test.mts`.
- [ ] Run `npm run test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Re-read changed Chinese files with explicit UTF-8 output.
