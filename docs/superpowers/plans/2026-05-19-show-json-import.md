# Show JSON Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JSON import for `admin/shows`, including automatic upload of locally referenced images before creating the show record.

**Architecture:** Keep the existing manual create/edit flow intact. Add a dedicated import path in the admin UI, normalize the imported payload in shared helpers, and use a dedicated Route Handler to read local files, upload them to storage, then create the show with final URLs.

**Tech Stack:** Next.js 16 Route Handlers, React client component, Ant Design upload/input controls, Supabase Storage, Node.js file system APIs, Node test runner.

---

### Task 1: Lock the import contract with tests

**Files:**
- Modify: `tests/show-manager-core.test.mts`
- Test: `tests/show-manager-core.test.mts`

- [ ] Add failing tests for imported JSON normalization and UI affordance.
- [ ] Run `npm test -- tests/show-manager-core.test.mts` or the project-equivalent targeted test command and confirm failure.

### Task 2: Implement client-side import helpers and UI

**Files:**
- Modify: `src/components/admin/show-manager-core.ts`
- Modify: `src/components/admin/ShowManager.tsx`

- [ ] Add minimal helpers to parse imported show JSON and normalize the request payload.
- [ ] Add a `导入 JSON` control in `ShowManager` and wire it to the new import request.
- [ ] Re-run the targeted show manager test and make it pass.

### Task 3: Implement server-side import route and storage reuse

**Files:**
- Create: `src/app/api/admin/shows/import/route.ts`
- Create: `src/lib/server/storage/admin-images.ts`
- Modify: `src/app/api/admin/images/upload/route.ts`

- [ ] Extract reusable storage upload helpers from the existing image upload route.
- [ ] Add a dedicated show import route that validates JSON, reads local files, uploads them, and creates the show.
- [ ] Re-run the targeted tests and ensure they stay green.

### Task 4: Update process rules and verify UTF-8 readability

**Files:**
- Modify: `AGENTS.md`

- [ ] Add a concise rule that explicit user requests to skip lint must be honored.
- [ ] Re-read modified Chinese files with UTF-8 output to confirm there is no mojibake.

### Task 5: Final verification

**Files:**
- Test: `tests/show-manager-core.test.mts`

- [ ] Run targeted tests for the changed show manager behavior.
- [ ] Do not run `lint`.
