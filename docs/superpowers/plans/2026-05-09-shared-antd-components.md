# Shared Antd Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build reusable shared antd Table and Modal wrappers with typed refs and testable core behavior.

**Architecture:** Put pure request and state helpers in colocated utility files, then build small `use client` React wrappers around antd. Export the components and public types from `src/components/shared/index.ts`.

**Tech Stack:** Next.js 16 client components, React 19 refs/hooks, antd 6, TypeScript strict mode, Node built-in test runner.

---

### Task 1: ApiTable Testable Core

**Files:**
- Create: `src/components/shared/api-table-core.ts`
- Test: `tests/shared-components.test.mts`

- [ ] Write failing tests for URL api query construction, function api invocation, response transform, and paging parameter merging.
- [ ] Run `node --test --experimental-strip-types tests/shared-components.test.mts` and confirm the tests fail because the helper module does not exist.
- [ ] Implement the minimal core helpers.
- [ ] Run the focused test and confirm it passes.

### Task 2: RefModal Testable Core

**Files:**
- Create: `src/components/shared/ref-modal-core.ts`
- Modify: `tests/shared-components.test.mts`

- [ ] Add failing tests for modal open and close state transitions.
- [ ] Run the focused test and confirm the new tests fail because the helper module does not exist.
- [ ] Implement the minimal modal state helpers.
- [ ] Run the focused test and confirm it passes.

### Task 3: React Components

**Files:**
- Create: `src/components/shared/ApiTable.tsx`
- Create: `src/components/shared/RefModal.tsx`
- Create: `src/components/shared/index.ts`

- [ ] Implement `ApiTable` as a client component around antd `Table`.
- [ ] Implement `RefModal` as a client component around antd `Modal`.
- [ ] Export components and public types from `src/components/shared/index.ts`.
- [ ] Run `npm run typecheck` and fix any type errors.

### Task 4: Verification

**Files:**
- Modify: `package.json`

- [ ] Include the new shared component tests in `npm run test`.
- [ ] Run `npm run test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Re-read changed Chinese files with UTF-8 to confirm readable content.
