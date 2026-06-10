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

## 本次骰子物理防回退方向

- 严禁斜角直接强制重置到地面。不要用 `setTranslation()` 把斜角骰子直接贴回托盘；不要用 `setRotation()` 强制摆正骰子姿态；这类做法截图看起来稳定，但玩家能看到“被系统摆回去”的假动作，之前已经确认不接受。相关函数：`startCorrectionMotion()`、`forceSettleUnsupportedDice()`、`applyCornerStandAssist()`。
- 异常悬空可以给向下物理脱困，但不要做瞬移。当前方向是确认“无真实支撑悬空”后给向下速度，让它自然落下；不是直接改位置，也不是改姿态。相关函数：`isUnsupportedAirborne()`、`startCorrectionMotion()`。
- 候选叠放要和假悬空区分。如果 A 在 B 上方，高度和投影都像叠放，只是 Rapier 暂时没检测到真实接触，不能立刻当作假悬空处理；这种情况只允许轻微向下贴合，不要给横向速度，不要加扭矩，否则 A 会被打飞、旋转落地，和“允许骰子叠加”冲突。相关函数：`hasStackSupport()`、`hasCandidateStackSupport()`、`getSupportDie()`、`getRestingHeight()`、`startCorrectionMotion()`。
- 真正假悬空才允许横向速度和扭矩。只有完全没有候选叠放支撑、也没有托盘或真实支撑时，才可以给横向滑落速度和小扭矩；目的只是从卡边、假支撑、墙边等异常状态脱出来，力度要克制，不能像爆开一样弹走。相关函数：`startCorrectionMotion()`、`getAirborneRecoveryLateralDirection()`。
- 不要为了减少浮空，把所有叠放都打散。叠放是允许玩法，修复浮空时必须保护合法叠放；判断顺序应保持为：真实接触支撑 > 候选叠放保护 > 真正无支撑悬空脱困。相关函数：`hasStackSupport()`、`hasCandidateStackSupport()`、`isUnsupportedAirborne()`、`startCorrectionMotion()`。
- 边界保护不能制造漂移。边界和底部保护只负责防穿透、防越界，不应在骰子已睡眠或已结算后反复唤醒刚体；`MIN_DIE_CENTER_HEIGHT` 与 `BOUNDS_MIN_DIE_CENTER_HEIGHT` 要继续区分，前者是自然贴盘高度，后者是防穿透下限。相关函数：`keepDiceInsideBounds()`。
- 后续调参优先看触发条件，再调力度。如果骰子被打飞，优先检查是否误把候选叠放当假悬空；如果骰子浮空太久，再适度调整真正假悬空的向下速度、横向速度和扭矩；不要回到强制贴地、强制摆正。相关入口：`isUnsupportedAirborne()`、`hasCandidateStackSupport()`、`AIRBORNE_RECOVERY_*` 常量。
- 调试记录已写入 `window.__diceDebug`、`sessionStorage['coin-pusher:dice-debug']` 和 `<html data-dice-debug="...">`；`diceStates` 可直接读取每颗骰子的 `height`、`topFaceDot`、`hasTrayContact`、`hasStackSupport`、`isNearGroundCornerStand`、`isUnsupportedAirborne` 等状态。

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
- `pnpm test:coin-pusher:web-game -- --url http://127.0.0.1:5173/ --click-selector ".mode-card.primary" --actions-file .codex/skills/develop-web-game/references/action_payloads.json`

## 风险点

- `isDieClearlyCornerStanding` 和 `isNearGroundCornerStand` 会影响结算流程，调整前需要做影响分析并小步验证。
- 向上冲量容易带回弹跳问题，默认最后再调。
- `startCorrectionMotion` 与 `isUnsupportedAirborne` 容易造成重复纠偏和边界回推，需要和斜角助推分开排查。
- 构建产物较大，`vite build` 仍可能提示 chunk 超过 500 kB。
