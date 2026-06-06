# web 项目目录结构

## 用途

本文只维护 `apps/web` 的真实目录结构、模块落点和新增目录同步规则。页面功能摘要看 `project-quick-brief.md`，后端接口和 Supabase 细节看 `backend-next-supabase-guide.md`。

## 概览

```text
apps/web
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ (site)/
│  │  ├─ (admin)/
│  │  └─ api/
│  ├─ components/
│  │  ├─ shared/
│  │  ├─ site/
│  │  └─ admin/
│  ├─ lib/
│  │  ├─ client/
│  │  ├─ admin/
│  │  ├─ auth/
│  │  ├─ server/
│  │  └─ utils/
│  └─ types/
├─ tests/
├─ package.json
├─ next.config.ts
├─ tsconfig.json
└─ eslint.config.mjs
```

## 目录职责

- `src/app/(site)`：前台页面和前台布局。
- `src/app/(admin)`：后台页面和后台布局。
- `src/app/api`：Next.js Route Handler。
- `src/components/shared`：跨页面复用组件。
- `src/components/site`：前台专用组件。
- `src/components/admin`：后台专用组件。
- `src/lib/client`：浏览器端能力。
- `src/lib/server`：只在服务端使用的鉴权、Supabase、内容数据层和外部服务封装。
- `src/lib/server/tos`：TOS 服务端配置、STS 临时凭证和图书 PDF 预签名能力。
- `src/lib/server/openai`：服务端 OpenAI 能力，当前包含后台 AI 图片生成。
- `src/types`：接口、内容和表单类型。
- `tests`：核心逻辑和页面行为测试。

## 落点规则

- 页面交互、浏览器状态、前端展示逻辑优先放在 `src/app`、`src/components` 或 `src/lib/client`。
- 数据读取、鉴权、接口、服务端动作和外部服务封装优先放在 `src/app/api` 或 `src/lib/server`。
- 公共组件放在 `src/components/shared`。
- 业务域组件放在 `src/components/<domain>`。
- 通用类型放在 `src/types`。

## 文档同步

新增功能后，如果出现新目录、新入口或职责变化，需要同步更新本文档。

每个项目都维护两份基础项目文档：

- `docs/<project>/project-directory-structure.md`：项目大体结构。
- `docs/<project>/project-quick-brief.md`：项目功能块和快速阅读摘要。
