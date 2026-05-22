# 项目快速阅读摘要

## 现状

- 技术栈是 `Next.js 16.2.4`、`React 19`、`antd 6.3.7`、`Supabase`。
- 项目是“前台展示 + 后台管理”的单体应用，当前聚焦图片收藏和电视剧推荐。
- 内容读写入口在 `src/lib/server/content/store.ts`，Supabase 表缺失时会回落到 mock 数据。

## 关键入口

- 前台页面：`src/app/(site)`
- 后台页面：`src/app/(admin)/admin`
- API 路由：`src/app/api/auth`、`src/app/api/public`、`src/app/api/admin`
- 路由守卫：`src/proxy.ts`
- 全局壳：`src/app/layout.tsx`、`src/components/site/SiteHeader.tsx`、`src/components/admin/AdminShell.tsx`

## 模块职责

- `src/components/shared`：`ApiTable`、`RefModal`、`GlobalMessageProvider` 等公共组件。
- `src/components/site`：前台导航、登录弹窗、详情页展示。
- `src/components/admin`：后台仪表盘与图片、电视剧管理。
- `src/lib/server/auth`：会话 Cookie、Supabase Auth、管理员鉴权。
- `src/lib/server/content`：图片、电视剧、标签等内容数据访问。
- `src/types`：接口、内容、表单类型。

## 验证命令

- `pnpm test`
- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`

## 风险点

- `AUTH_SECRET` 和 Supabase 环境变量必须可用。
- `src/lib/server/content/store.ts` 仍有 fallback mock 数据。
- 后台页面和后台 API 都依赖 `src/proxy.ts` 的会话校验。
