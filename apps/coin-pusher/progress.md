Original prompt: 查看coin-pusher项目，为什么会出现斜角站立的问题，然后会根据角度再触发力，然后疯狂有音效

- 2026-06-05: 开始排查 coin-pusher 骰子场景异常，已定位到 src/dice/DiceRollerScene.ts 内 corner assist、settle、impact 相关逻辑。
- 2026-06-05: 待确认是否为 corner assist 在近静止状态下重复施加冲量/扭矩，导致再次碰撞并连续触发 diceImpact 音效。
- 2026-06-05: 已将 src/dice/DiceRollerScene.ts 的斜角扶正逻辑从“反复施加冲量/扭矩”改为“结算阶段一次性稳定落面”，先处理斜角站立与二次激活，不处理音效逻辑。
- 2026-06-05: 已用 UTF-8 复读关键文件。`npm run typecheck` 已通过。自动化脚本验证受限于本地缺少 `playwright`，本轮以本地页面刷新回测为主。
- 2026-06-05: src/dice/DiceRollerScene.ts 已改为“贴地斜角走 applyCornerStandAssist 轻助推 + cooldown + attempts 递增，悬空态才走 correctionMotion 下落复位”，并把 correctionMotion 的最低 Y 钳制放在 keepDiceInsideBounds 之前与内部双重保护，减少底部穿透。
- 2026-06-05: `pnpm build`、`pnpm test` 已通过；浏览器里连续 3 次摇骰未看到明显底部穿透，正常叠放仍可出现。后续仍值得继续观察少量边缘态：贴地角落长时间抽搐、短暂悬停、以及遮罩关闭过程附近的极端碰撞。
- 2026-06-05: 针对“斜角站立重置贴地太突兀”，已把贴地斜角分支前置到悬空判断之前，并降低 applyCornerStandAssist 的抬升、横向和扭矩冲量，让低位斜角先释放给物理世界自由落体/自然滚正，只有真正离开支撑面的骰子才进入 correctionMotion。
- 2026-06-05: 针对“允许骰子叠加但叠加会立刻重置”，已将 isUnsupportedAirborne 的支撑高度判断改回候选叠放高度，不再要求叠放瞬间必须有严格接触，避免合法叠放因接触丢帧或覆盖率临界被误判为悬空。
- 2026-06-05: 针对“平稳后仍重置且像旋转一圈”，已让 startCorrectionMotion 只修正下落高度、保持当前姿态不变；同时新增 CORNER_STAND_FACE_DOT，只把明显斜角当作异常，轻微倾斜的稳定骰子不再进入扶正逻辑。
- 2026-06-05: 现场观察到左侧骰子处于贴地斜角姿态，推测 applyCornerStandAssist 在低速稳定态反复触发造成抽搐；本轮将 CORNER_ASSIST_MAX_ATTEMPTS 从 6 降到 3，并在次数耗尽后停止继续助推、允许当前姿态结算，避免无限“戳骰子”。`pnpm build`、`pnpm test` 均通过，浏览器刷新后回测 3 轮未见持续抽搐，控制台仍仅有 Rapier 初始化弃用警告。
- 2026-06-05: 针对“斜角站立助推高度看起来在跳动然后落地”，已只下调高度方向冲量：CORNER_ASSIST_UPWARD_IMPULSE_MIN/MAX 从 0.014/0.034 降到 0.004/0.012，保留横向和扭矩助推以维持自然滚正。`pnpm build`、`pnpm test` 均通过；浏览器轻量回测显示摇骰可正常结算且无新增控制台错误，WebGL 截图接口本轮偶发超时。
- 2026-06-05: 继续针对“最右边骰子弹跳好几次后才会正”，将 CORNER_ASSIST_UPWARD_IMPULSE_MIN/MAX 进一步从 0.004/0.012 降到 0.001/0.003，让斜角助推几乎不再产生可见离地，只保留横向和扭矩滚正。`pnpm build`、`pnpm test` 均通过；浏览器刷新后摇骰，间隔 700ms 两帧一致，未见持续跳动或新增控制台错误。
- 2026-06-05: 新增浏览器内调试记录，最近一轮摇骰会写入 `window.__diceDebug`、`sessionStorage['coin-pusher:dice-debug']` 和 `<html data-dice-debug="...">`。记录包含 `assistCounts`（1~5 号骰子各自触发斜角助推/疑似弹跳次数）、`assists` 明细（骰子编号、次数、向上冲量、横向冲量、扭矩、高度、角度等）。`pnpm build`、`pnpm test` 均通过；浏览器刷新后摇一轮，DOM 读取成功，本轮 `assistCounts` 为 `[0,0,0,0,0]`。
- 2026-06-05: 扩展调试记录以区分非斜角助推来源：新增 `physicsBounceCounts/physicsBounces`（普通落地反弹）、`boundsCorrectionCounts/boundsCorrections`（边界/底部回推）、`correctionMotionCounts/correctionMotions`（悬空下落纠偏）、`impacts`（强碰撞）。`pnpm build`、`pnpm test` 均通过；浏览器回测显示 `assistCounts=[0,0,0,0,0]`，但 5 号骰子出现 `correctionMotionCounts[4]=5` 和 `boundsCorrectionCounts[4]=5`，说明当前小弹跳更可能来自悬空纠偏与底部钳制链路，而不是斜角助推。
- 2026-06-05: 针对“先收 isUnsupportedAirborne 或 startCorrectionMotion 的重复触发”，已在 `isUnsupportedAirborne` 中增加真实支撑过滤：如果骰子已有正常叠放支撑，或真实接触托盘且 resting height 仍在托盘底部，则不再判定为悬空，避免反复进入 `startCorrectionMotion -> keepDiceInsideBounds`。`pnpm build`、`pnpm test` 均通过；浏览器刷新后 3 轮回测中 `correctionMotionCounts` 与 `boundsCorrectionCounts` 均为 `[0,0,0,0,0]`。
- 2026-06-05: 针对“希望直接读到每颗骰子的 topFaceDot/height”，已在现有浏览器调试记录中新增 `diceStates` 姿态快照，包含每颗骰子的 `height/restingHeight/stableRestingHeight/topFaceDot/linearSpeed/angularSpeed/nearTrayBase/hasTrayContact/hasStackSupport/isCornerStanding/isNearGroundCornerStand/isUnsupportedAirborne`。该改动只读诊断数据，不改变物理行为；`pnpm build`、`pnpm test` 均通过，浏览器实测可从 `<html data-dice-debug>` 读到新字段。
- 2026-06-05: 现场出现两个贴地斜角站立；`diceStates` 显示 5 号骰子 `topFaceDot=0.856` 且已触发 3 次助推后仍被结算，4 号骰子 `topFaceDot=0.957` 因阈值过保守未被识别。已将 `CORNER_STAND_FACE_DOT` 提到 `0.965`，`CORNER_ASSIST_MAX_ATTEMPTS` 提到 `5`，并只增强横向/扭矩助推上限，不增加向上冲量；同时移除“次数耗尽后放过斜角”的结算口子。`pnpm build`、`pnpm test` 均通过；浏览器刷新后 5 轮回测未再出现 finished 后 `isNearGroundCornerStand=true` 的骰子。
- 2026-06-06: 金币模型改为可选运行时加载：`src/assets/gold coin.glb` 本地存在时优先加载，缺失或加载失败时自动使用圆柱饼状金币；同时将该大型 `.glb` 文件加入 `.gitignore`，避免提交到仓库。
