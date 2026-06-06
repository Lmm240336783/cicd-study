# coin-pusher

`coin-pusher` 是一个基于 `Vite`、`React`、`TypeScript`、`Three.js` 和 `Rapier 3D` 的 Web 端 3D 游戏原型。当前应用包含摇骰子、推币机、老虎机和本地语音调试入口，近期重点是摇骰子物理稳定性。

## 运行命令

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

在 monorepo 根目录也可以使用：

```bash
pnpm dev:coin-pusher
pnpm build:coin-pusher
pnpm test:coin-pusher
pnpm lint:coin-pusher
pnpm typecheck:coin-pusher
```

## 当前设计方向

- 摇骰子是当前优先调试玩法，重点是让骰子自然落稳、可叠放、少抽搐、不突兀重置。
- 推币机和老虎机进入冻结状态：代码和当前原型保留，但 UI 入口暂不开放，不继续沿旧方案扩展。
- 玩法设计文档不再分散到多个旧文件，项目级事实先维护在 `docs/coin-pusher/project-quick-brief.md` 与 `docs/coin-pusher/project-directory-structure.md`。
- 新设计方案后续应先明确目标、约束和验证方式，再新增文档，避免继续堆叠过期方案。

## 冻结范围

- `src/GameApp.ts`、`src/machine` 和 `src/slot` 保留作为推币机/老虎机原型代码。
- 首页中的推币机与老虎机卡片保持 disabled，不作为当前可用玩法入口。
- 冻结期间不按旧方案继续细调推币机或老虎机，只在明确重启方案后再重新设计。

## 骰子物理原则

- 保留正常叠放，不把合法叠放判成异常。
- 只纠正贴地斜角站立，不处理正常稳定结果。
- 不做突兀的几何复位，优先使用横向和扭矩助推让骰子自然滚正。
- 向上冲量是最后手段，默认不增加，避免弹跳和抽搐回潮。
- 结算前需要确认最终姿态合法，不能在仍然贴地斜角时直接 `finishRoll`。

## 骰子调试方法

浏览器中最近一轮摇骰调试数据会写入：

```js
window.__diceDebug
sessionStorage.getItem('coin-pusher:dice-debug')
document.documentElement.getAttribute('data-dice-debug')
```

推荐读取：

```js
JSON.parse(document.documentElement.getAttribute('data-dice-debug'))
```

重点字段：

- `diceStates[].height`：骰子中心高度。
- `diceStates[].topFaceDot`：顶面接近合法朝上的程度，越接近 `1` 越稳定。
- `diceStates[].hasTrayContact`：是否真实接触托盘。
- `diceStates[].hasStackSupport`：是否属于正常叠放。
- `diceStates[].isNearGroundCornerStand`：是否命中贴地斜角站立。
- `assistCounts`：每颗骰子的斜角助推次数。
- `correctionMotionCounts`：悬空下落纠偏次数。
- `boundsCorrectionCounts`：边界或底部回推次数。

## 细调顺序

1. 先看 `diceStates`，确认问题属于识别漏判、助推无效、结算过早，还是悬空/边界回推。
2. 肉眼明显斜但 `isNearGroundCornerStand=false` 时，检查 `topFaceDot`、高度、托盘接触和叠放支撑条件。
3. `assistCounts` 高但仍斜时，优先调横向/扭矩和结算验收，不优先调向上冲量。
4. `correctionMotionCounts` 或 `boundsCorrectionCounts` 高时，优先排查悬空纠偏和边界钳制，不归因于斜角助推。
5. `hasStackSupport=true` 时优先视为正常叠放，不为了纠正斜角破坏叠放。

## 后续方案方向

- 将骰子稳定逻辑拆成姿态检测、脱困动作、结算验收三层。
- 用最终姿态验收器阻止明显斜角进入最终结果。
- 引入接触法线和支撑多边形判断，减少只靠单一角度阈值。
- 使用低频横向/扭矩微推序列，而不是持续增加单次力度。
- 如果极端姿态仍高频出现，再考虑重模拟或结果验收策略，不在玩家眼前做突兀复位。
