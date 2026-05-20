# Admin Image Manager UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin images placeholder with a styled table-driven management screen using the shared shared antd table and modal wrappers.

**Architecture:** Keep data loading in `ApiTable`, keep image form state in a focused admin client component, and leave API mutations as UI-only actions for now. Use a small pure helper module for row decoration and modal defaults so the behavior stays testable without browser tooling.

**Tech Stack:** Next.js 16 App Router, React 19 client components, antd 6, TypeScript strict mode, Node built-in test runner.

---

### Task 1: Image manager helpers

**Files:**
- Create: `src/components/admin/image-manager-core.ts`
- Test: `tests/image-manager-core.test.mts`

- [ ] Write failing tests for row priority decoration and modal default values.
- [ ] Run `node --test --experimental-strip-types tests/image-manager-core.test.mts` and confirm it fails because the helper module does not exist.
- [ ] Implement the minimal helper functions.
- [ ] Run the focused test and confirm it passes.

### Task 2: Image manager UI

**Files:**
- Create: `src/components/admin/ImageManager.tsx`
- Modify: `src/app/(admin)/admin/images/page.tsx`

- [ ] Implement the client component with `ApiTable`, `RefModal`, Upload, tags, priority, edit, and delete confirmation shells.
- [ ] Replace the placeholder page content with the new component.
- [ ] Run `npm run typecheck` and fix any type issues.

### Task 3: Verification

**Files:**
- Modify: `package.json` if needed

- [ ] Run `npm run test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Re-read changed Chinese files with UTF-8 to confirm readable content.
