# web 项目差异补充

> 根 `AGENTS.md`、`docs/rules` 与 `.agents/skills` 是主规则来源；本文件只补充 `apps/web` 的少量项目差异。

## 项目概述

本项目是 monorepo 下的 Next.js Web 应用，源码目录是 `apps/web`，项目文档目录是 `docs/web`。

## Next.js 差异

1. 当前 Next.js 版本可能与既有认知不同，涉及 Next.js API、路由约定、版本行为差异时，优先查本地官方文档目录：`node_modules/next/dist/docs/`。
2. 未完成相关文档核对前，不进入 Next.js 代码改写阶段。
3. 细则文档：[../../docs/rules/nextjs.md](../../docs/rules/nextjs.md)

## 路径补充

1. 公共组件目录统一为 `apps/web/src/components/shared`。
2. 业务域组件放在 `apps/web/src/components/<domain>`（示例：`apps/web/src/components/admin`）。
3. 公共类型目录统一为 `apps/web/src/types`。
4. 服务端能力优先收口在 `apps/web/src/lib/server`。
5. 功能落地后，同步更新 [../../docs/web/project-directory-structure.md](../../docs/web/project-directory-structure.md)。
