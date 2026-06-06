# web 项目快速阅读摘要

## 阅读顺序

1. 先读本文，建立 `apps/web` 的当前状态和关键入口。
2. 需要判断文件落点或新增目录时，读 `project-directory-structure.md`。
3. 需要修改 Route Handler、Supabase、Auth、Storage 或服务端数据层时，读 `backend-next-supabase-guide.md`。

## 现状

- 技术栈是 `Next.js 16.2.4`、`React 19`、`antd 6.3.7`、`Supabase`。
- 仓库已切到 `pnpm workspace + Turborepo`，当前 Web 应用源码在 `apps/web`。
- `apps/web` 是“前台展示 + 后台管理 + API”一体的 Next.js 应用。
- 内容读写主要收口在 `apps/web/src/lib/server/content/store.ts`。

## 关键入口

- 工作区根：`package.json`、`pnpm-workspace.yaml`、`turbo.json`
- Web 应用：`apps/web`
- 前台页面：`apps/web/src/app/(site)`
- 后台页面：`apps/web/src/app/(admin)/admin`
- API 路由：`apps/web/src/app/api`
- 路由守卫：`apps/web/src/proxy.ts`
- 全局布局：`apps/web/src/app/layout.tsx`
- 前台壳：`apps/web/src/components/site/SiteHeader.tsx`
- 后台壳：`apps/web/src/components/admin/AdminShell.tsx`

## 模块职责

- `apps/web/src/app`：Next.js 页面、布局和 Route Handler。
- `apps/web/src/components/shared`：跨页面复用组件。
- `apps/web/src/components/site`：前台展示组件。
- `apps/web/src/components/admin`：后台管理组件。
- `apps/web/src/lib/server`：服务端鉴权、Supabase、内容数据层和外部服务封装。
- `apps/web/src/lib/client`：浏览器端能力。
- `apps/web/src/types`：接口、内容和表单类型。
- `apps/web/tests`：核心逻辑和页面行为测试。

## 文档分工

- `project-quick-brief.md`：当前项目快速摘要、关键入口、验证命令和风险点。
- `project-directory-structure.md`：项目目录结构、客户端/服务端落点和新增目录同步规则。
- `backend-next-supabase-guide.md`：Next.js 后端、Supabase、Auth、Storage 和服务端流程参考。
- `supabase-content-schema.sql`：内容数据表结构示例。

## 验证命令

- `pnpm test:web`
- `pnpm build:web`
- `pnpm typecheck:web`
- `pnpm lint:web`

## 风险点

- `AUTH_SECRET` 和 Supabase 环境变量必须可用。
- `apps/web/src/lib/server/content/store.ts` 仍有 fallback mock 数据。
- 后台页面和后台 API 都依赖 `apps/web/src/proxy.ts` 的会话校验。
- 根依赖变更后需要执行 `pnpm install`，确保锁文件和 workspace 链接同步。
