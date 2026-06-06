# AGENTS.md - cicd-study

本文件是 agent 进入仓库后的第一入口，负责说明仓库定位、主规则来源、项目边界和完成标准。根 `AGENTS.md`、`docs/rules` 与 `.agents/skills` 覆盖大部分规则；项目级 `AGENTS.md` 只补充少量项目特有差异。

## Project

`cicd-study` 是一个 `pnpm workspace + Turborepo` 仓库。

当前应用：

- `apps/web`：Next.js 16 + React 19 + antd + Supabase 的 Web 应用。
- `apps/coin-pusher`：Vite + React + TypeScript + Three.js + Rapier 的 3D 推币机游戏原型。

根目录只负责 workspace、turbo 编排、仓库级脚本、跨项目规则和文档索引。

## Read First

按任务命中范围选择入口。

| 任务范围 | 入口 |
| --- | --- |
| 仓库规则、跨项目调整、文档结构 | `AGENTS.md` |
| Web / Next.js / 后台管理 / API | `AGENTS.md` + `apps/web/AGENTS.md` 补充 |
| 推币机 / 3D 游戏 / Vite 应用 | `AGENTS.md` + `apps/coin-pusher/AGENTS.md` 补充 |
| Web 项目现状 | `docs/web/project-quick-brief.md` |
| Web 目录同步 | `docs/web/project-directory-structure.md` |
| coin-pusher 项目现状 | `docs/coin-pusher/project-quick-brief.md` |
| coin-pusher 目录同步 | `docs/coin-pusher/project-directory-structure.md` |
| 通用规则细则 | `docs/rules/README.md` |
| 可执行流程 skills | `.agents/skills/INDEX.md` |

## Rule Sources

稳定规则维护在 `docs/rules`，可执行流程维护在 `.agents/skills`：

| 规则主题 | 细则 |
| --- | --- |
| 检索边界 | `docs/rules/retrieval.md` |
| 注释边界 | `docs/rules/comments.md` |
| 样式分工 | `docs/rules/styling.md` |
| 类型组织 | `docs/rules/types.md` |
| Next.js 检索 | `docs/rules/nextjs.md` |
| 中文与编码 | `.agents/skills/encoding-guard/SKILL.md` |
| 组件复用 | `.agents/skills/component-reuse-guard/SKILL.md` |
| 修改完成度 | `.agents/skills/task-completion-guard/SKILL.md` |
| 交付与文档同步 | `.agents/skills/delivery-reporting/SKILL.md` |
| skill 使用披露 | `.agents/skills/skill-usage-disclosure/SKILL.md` |

优先级：系统/开发者指令 > 根 `AGENTS.md` > `docs/rules` / `.agents/skills` > 项目级 `AGENTS.md` 差异补充。

## Project Routing

- 修改 `apps/web` 时，以根规则和 `docs/rules` 为主，再读 `apps/web/AGENTS.md` 补充 Web 差异。
- 修改 `apps/coin-pusher` 时，以根规则和 `docs/rules` 为主，再读 `apps/coin-pusher/AGENTS.md` 补充游戏项目差异。
- 新增项目时，项目代码放入 `apps/<project>`，并同步新增 `apps/<project>/AGENTS.md`、`docs/<project>/project-directory-structure.md` 与 `docs/<project>/project-quick-brief.md`。
- 项目文档直接放在 `docs/<project>`。

## Documentation Sync

- 上下文交接、项目摘要、快速阅读类请求，更新对应 `docs/<project>/project-quick-brief.md`。
- 新增功能后，更新对应 `docs/<project>/project-directory-structure.md`。
- 项目纪要只记录当前事实、入口、模块职责、验证命令和待办风险点。

## Commands

| 目标 | 命令 |
| --- | --- |
| Web 开发 | `pnpm dev:web` |
| coin-pusher 开发 | `pnpm dev:coin-pusher` |
| Web 构建 | `pnpm build:web` |
| coin-pusher 构建 | `pnpm build:coin-pusher` |
| 全量构建 | `pnpm build:all` |
| Web 类型检查 | `pnpm typecheck:web` |
| coin-pusher 类型检查 | `pnpm typecheck:coin-pusher` |
| 全量类型检查 | `pnpm typecheck:all` |
| Web 测试 | `pnpm test:web` |
| coin-pusher 测试 | `pnpm test:coin-pusher` |
| 全量测试 | `pnpm test:all` |
| Web lint | `pnpm lint:web` |
| coin-pusher lint | `pnpm lint:coin-pusher` |
| 全量 lint | `pnpm lint:all` |

## Done Means

- 根 `AGENTS.md`、`docs/rules`、`.agents/skills` 与命中项目的补充规则已按需执行。
- 相关项目文档已按规则同步。
- 已执行与改动匹配的最小必要验证；若未执行，需说明原因。
