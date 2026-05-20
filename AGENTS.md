<!-- BEGIN:nextjs-agent-rules -->
# 注意：当前 Next.js 版本可能与既有认知不同

该版本包含破坏性变更，接口、约定和目录结构都可能与旧经验不同。编写代码前，请先阅读 `node_modules/next/dist/docs/` 中的相关指南，并注意弃用提示。
<!-- END:nextjs-agent-rules -->

# 规则检索与映射

## 1. 文件用途
`AGENTS.md` 仅用于：
- 检索边界与执行规则。
- 技能的触发与映射说明。

不在本文件记录业务需求、开发日志或实现细节。

## 2. 规则分层与优先级（强制）
1. `AGENTS.md` 保留核心硬规则，必须可快速读完并可执行。
2. 细节流程与示例放到 `docs/rules/*.md`。
3. 若 `AGENTS.md` 与细则文档冲突，以 `AGENTS.md` 为准。
4. 若细则文档缺失或不可读，按 `AGENTS.md` 核心条款执行，不得阻塞任务。

## 3. 检索规则（强制）
1. 严禁开局全量扫描项目文件。
2. 仅检索“将要修改的文件”和“直接相关依赖文件”。
3. 仅在用户明确要求全项目审查或全量重构时扩大范围。
4. 细则文档：[docs/rules/retrieval.md](./docs/rules/retrieval.md)

## 4. 中文与编码规则（强制）
1. 严禁中文乱码。
2. 中文文件统一使用 UTF-8 编码。
3. 修改后需用 UTF-8 复读关键文件并确认可读。
4. 细则文档：[docs/rules/encoding.md](./docs/rules/encoding.md)

## 5. 修改流程规则（强制）
1. 非流程类文档修改前，必须先提交“修改方案”（改动文件、改动方式、影响点）。
2. 流程类文档可直接修改（如 `AGENTS.md`、`docs/*`、README 流程段）。
3. 细则文档：[docs/rules/change-process.md](./docs/rules/change-process.md)

## 6. 注释规则（强制）
1. 新增函数/方法需添加简短注释，说明“该函数做什么”。
2. 禁止无信息注释（例如解释简单赋值语句）。
3. 细则文档：[docs/rules/comments.md](./docs/rules/comments.md)

## 7. 组件复用规则（强制）
1. 公共组件目录统一为 `src/components/shared`。
2. 业务域组件放在 `src/components/<domain>`（示例：`src/components/admin`）。
3. 动刀前先检索是否已有可复用组件，优先复用。
4. 设计差异过大时可新建组件，不强行兼容旧组件。
5. 细则文档：[docs/rules/component-reuse.md](./docs/rules/component-reuse.md)

## 8. 样式规范（强制）
1. 基础布局、尺寸、间距统一使用 Tailwind。
2. 阴影、渐变、动画、伪元素等复杂样式使用 `.scss`。
3. 细则文档：[docs/rules/styling.md](./docs/rules/styling.md)

## 9. 类型规范（强制）
1. 通用表单类型、接口类型统一存放在公共类型文件。
2. 公共类型目录统一为 `src/types`。
3. 推荐拆分：`src/types/forms.ts`、`src/types/api.ts`、`src/types/index.ts`。
4. 细则文档：[docs/rules/types.md](./docs/rules/types.md)

## 10. 自动沉淀技能（强制）
1. 同类任务反复出现时，需沉淀为可复用技能。
2. 沉淀内容至少包含：适用场景、输入输出、步骤、边界、示例。
3. 新任务开始前先检索已有技能，能复用则优先复用。
4. 现有技能不适配且改造成本高时再新增技能。
5. 细则文档：[docs/rules/skills.md](./docs/rules/skills.md)

## 11. Next.js 检索映射（强制）
1. 凡涉及 Next.js API、路由约定、版本行为差异，优先查本地官方文档目录：`node_modules/next/dist/docs/`。
2. 未完成相关文档核对前，不进入代码改写阶段。
3. 细则文档：[docs/rules/nextjs.md](./docs/rules/nextjs.md)

## 12. 默认不做兼容与兜底（强制）
1. 以后修改默认直接按新方案实现，不保留旧路径、旧入口或旧实现的兼容分支。
2. 不额外添加兜底逻辑、降级逻辑或迁移期保护，未上线场景不按线上风险处理。
3. 只有用户明确要求保留兼容或过渡方案时，才单独评估是否需要添加。

## 13. 项目纪要更新规则（强制）
1. 当用户要求“生成摘要”“汇总本窗口所有对话”“新窗口快速了解”“项目快速阅读”等上下文交接内容时，需重新生成 `docs/project-quick-brief.md`。
2. 纪要只记录当前事实、入口、模块职责、验证命令和待办风险点。
3. 少写“曾经如何”，多写“现在如何”；避免记录迁移历史、开发流水和已废弃路径。

## 14. Lint 执行规则（强制）
1. 当用户明确要求本次不要执行 `lint` 时，必须跳过 `lint`，不得把 `lint` 作为完成前置条件。
