# cicd-study Skill Index

本索引用于确认项目级 skills 的职责边界。可执行流程优先沉淀为 skill，稳定目录与项目结构规则继续保留在 `AGENTS.md`、项目级 `AGENTS.md` 或 `docs/rules`。

## 使用约定

- 任务开始后，先按场景判断是否需要启用 `.agents/skills/*/SKILL.md`。
- 只要本回合启用了任何项目 skill，就按 `skill-usage-disclosure` 简短说明使用了哪些以及原因。
- 涉及中文、Markdown、skill、配置示例或任何非 ASCII 文本改动时，使用 `encoding-guard` 做前后检查。
- 不要引用已经不存在的 skill；以本索引和实际 `.agents/skills/*/SKILL.md` 为准。

## Skills

| Skill | 触发场景 |
| --- | --- |
| `skill-usage-disclosure` | 只要本回合启用了任何项目 skill，就简短说明使用了哪些以及原因。 |
| `encoding-guard` | 修改中文、Markdown、skill、配置示例或任何非 ASCII 文本前后使用，防止乱码和文本丢失。 |
| `task-completion-guard` | 多步骤任务、计划后实施、需要验证或容易停在口头承诺的任务。 |
| `component-reuse-guard` | 发现重复 JSX、重复 handler、重复弹窗/表单/上传/列表逻辑时，先复用或抽取。 |
| `delivery-reporting` | 用户要求分阶段汇报，或改动需要判断/同步项目文档时。 |
