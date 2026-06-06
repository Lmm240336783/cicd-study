# coin-pusher 快速阅读摘要

## 现状

- 技术栈是 `Vite 6`、`React 19`、`TypeScript`、`Three.js`、`Rapier 3D`、`Vitest`。
- 当前项目位于 `apps/coin-pusher`，是 monorepo 下的独立 Vite 应用。
- 玩法入口包含摇骰子和语音调试；推币机原型和老虎机原型处于冻结状态，代码保留但 UI 入口暂不开放。
- `docs/coin-pusher` 目前只保留项目快速摘要与目录结构，旧设计方案文档已清理，后续方案重新补充。

## 关键入口

- 应用入口：`apps/coin-pusher/src/main.tsx`
- React 壳与玩法选择：`apps/coin-pusher/src/App.tsx`
- 路由定义：`apps/coin-pusher/src/appRoutes.ts`
- 骰子玩法 UI：`apps/coin-pusher/src/dice/DiceGame.tsx`
- 骰子物理场景：`apps/coin-pusher/src/dice/DiceRollerScene.ts`
- 推币机主体：`apps/coin-pusher/src/machine/CoinPusherMachine.ts`
- 本地语音调试：`apps/coin-pusher/scripts/voice-debug-server.mjs`

## 模块职责

- `apps/coin-pusher/src/core`：游戏状态、结算与配置核心逻辑。
- `apps/coin-pusher/src/machine`：冻结保留的推币机机柜与主玩法原型。
- `apps/coin-pusher/src/slot`：冻结保留的老虎机桥接与控制器。
- `apps/coin-pusher/src/dice`：摇骰子玩法、UI 和物理场景。
- `apps/coin-pusher/src/audio`：音频播放与控制。
- `apps/coin-pusher/src/voice`：语音调试页与接口封装。
- `apps/coin-pusher/README.md`：当前设计方向、运行命令和骰子物理调试入口。
- `docs/coin-pusher`：只保留项目快速摘要与目录结构。

## 本次骰子物理方向

- 保留正常骰子叠放，不把合法叠放当异常重置。
- 只处理贴地斜角站立：要求接近托盘、真实接触托盘、无有效叠放支撑、姿态明显非法。
- 避免突兀重置，改为小幅横向/扭矩助推，让骰子自然滚正。
- 不增加向上冲量，避免弹跳、抽搐和重复落地感回潮。
- 调试记录已写入 `window.__diceDebug`、`sessionStorage['coin-pusher:dice-debug']` 和 `<html data-dice-debug="...">`。
- `diceStates` 可直接读取每颗骰子的 `height`、`topFaceDot`、`hasTrayContact`、`hasStackSupport`、`isNearGroundCornerStand` 等状态。

## 冻结状态

- 推币机和老虎机当前不继续按旧设计方案推进。
- `src/GameApp.ts`、`src/machine`、`src/slot` 仍保留，便于后续重新启动方案时复用或对照。
- 首页推币机与老虎机入口保持 disabled，避免把冻结原型误当成当前可交付玩法。

## 细调方法

- 先读 `JSON.parse(document.documentElement.getAttribute('data-dice-debug'))`，不要只凭肉眼改参数。
- 若肉眼斜但 `isNearGroundCornerStand=false`，优先检查 `topFaceDot`、高度、托盘接触和叠放支撑条件。
- 若 `assistCounts` 高但仍斜，优先调横向/扭矩或结算放行条件，不优先调向上冲量。
- 若 `correctionMotionCounts` 或 `boundsCorrectionCounts` 高，说明问题更像悬空纠偏或边界回推，不应归因于斜角助推。
- 若 `hasStackSupport=true`，优先按正常叠放处理，不要为了斜角修正破坏叠放结果。

## 后续新思路

- 建议把骰子稳定逻辑拆成三层：姿态检测、脱困动作、结算验收，避免一个阈值同时承担多种职责。
- 可加入最终姿态验收器：只要仍有贴地斜角，就不允许 `finishRoll`。
- 可用接触法线和支撑多边形判断稳定性，减少单纯依赖 `topFaceDot` 的误判。
- 可设计低频微推序列，用方向变化的横向/扭矩脱困替代继续加大单次力度。
- 如果极端姿态仍常见，再评估重模拟或结果验收策略，不在玩家眼前做突兀几何复位。

## 验证命令

- `pnpm lint:coin-pusher`
- `pnpm typecheck:coin-pusher`
- `pnpm test:coin-pusher`
- `pnpm build:coin-pusher`

## 风险点

- `isDieClearlyCornerStanding` 和 `isNearGroundCornerStand` 会影响结算流程，调整前需要做影响分析并小步验证。
- 向上冲量容易带回弹跳问题，默认最后再调。
- `startCorrectionMotion` 与 `isUnsupportedAirborne` 容易造成重复纠偏和边界回推，需要和斜角助推分开排查。
- 构建产物较大，`vite build` 仍可能提示 chunk 超过 500 kB。
