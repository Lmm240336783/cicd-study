# coin-pusher 项目目录结构

## 概览

```text
apps/coin-pusher
├─ scripts/
├─ src/
│  ├─ assets/
│  ├─ audio/
│  ├─ core/
│  ├─ dice/
│  ├─ image/
│  ├─ machine/
│  ├─ slot/
│  ├─ ui/
│  ├─ voice/
│  ├─ App.tsx
│  ├─ appRoutes.ts
│  ├─ GameApp.ts
│  ├─ main.tsx
│  └─ style.css
├─ tests/
├─ AGENTS.md
├─ README.md
├─ eslint.config.mjs
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
└─ vercel.json

docs/coin-pusher
├─ monopoly-design-draft.md
├─ project-directory-structure.md
└─ project-quick-brief.md
```

## 维护约定

- 当前项目是 monorepo 下的独立 Vite 应用，依赖单独声明在 `apps/coin-pusher/package.json`。
- 客户端功能通常落在 `apps/coin-pusher/src` 下，当前玩法和交互都属于浏览器侧实现。
- 玩法逻辑优先沉淀到 `src/core`、`src/machine`、`src/slot`、`src/dice` 这类明确分层目录。
- 项目文档目前保留 `docs/coin-pusher/project-quick-brief.md`、`docs/coin-pusher/project-directory-structure.md` 与 `docs/coin-pusher/monopoly-design-draft.md`。
- 设计说明、玩法方案和专题分析后续重新补充，不再沿用已删除的旧文档。

## 说明

- `scripts`：本地语音调试服务等辅助脚本。
- `src/assets`：模型与音频资源。
- `src/audio`：音频播放与控制。
- `src/core`：配置、状态管理、组合与结算规则。
- `src/dice`：摇骰子独立页面目录，包含页面壳、UI、Three.js 场景和 Rapier 骰子物理，通过 `/dice` 路由进入。
- `src/image`：图片生成独立页面目录，包含页面壳和生成面板，通过 `/image` 路由进入，请求 `/api/images/generations`；本地由 Vite 代理补 key，部署端由 Vercel serverless 读取服务端环境变量并转发。
- `src/machine`：冻结保留的推币机主机柜与玩法原型。
- `src/slot`：老虎机独立全屏页面目录，包含页面壳、符号图案、固定 5x3 回合生成、控制逻辑与奖励桥接，通过 `/slot` 路由进入。
- `src/ui`：界面管理。
- `src/voice`：语音调试独立页面目录，包含页面壳与接口封装，通过 `/voice-debug` 路由进入。
- `tests`：Vitest 测试集合。
- `README.md`：应用运行、当前设计方向和骰子物理调试说明。

## 当前重点

- 应用入口是 `apps/coin-pusher/src/main.tsx`。
- 玩法选择和页面壳在 `apps/coin-pusher/src/App.tsx`。
- 路由入口在 `apps/coin-pusher/src/appRoutes.ts`。
- 图片生成入口位于首页摇骰子选项上方，点击后跳转到 `/image` 独立页面，页面实现为 `apps/coin-pusher/src/image/ImageGeneratorPanel.tsx`。
- 骰子玩法入口位于 `apps/coin-pusher/src/dice/DiceGame.tsx`，点击首页卡片后跳转到 `/dice` 独立页面。
- 骰子物理稳定性主要在 `apps/coin-pusher/src/dice/DiceRollerScene.ts`。
- 老虎玩法入口在 `apps/coin-pusher/src/slot/SlotGame.tsx`，点击首页卡片后跳转到 `/slot` 独立页面；符号图案在 `apps/coin-pusher/src/slot/SlotSymbols.tsx`，固定 5x3 回合生成在 `apps/coin-pusher/src/slot/SlotRound.ts`。
- 推币机主体原型在 `apps/coin-pusher/src/machine/CoinPusherMachine.ts`，当前冻结保留。
