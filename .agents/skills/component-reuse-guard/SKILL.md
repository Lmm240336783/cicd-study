---
name: component-reuse-guard
description: 判断重复 JSX、重复 handler、重复弹窗、表单、上传或列表逻辑是否应该复用或抽取。用于新增或修改前端组件、页面、管理端列表和交互逻辑时降低重复维护成本。
---

# Component Reuse Guard

## Trigger

使用此 skill 当出现：

- 两处以上 JSX 结构几乎相同。
- 相同的 state + handler 组合被复制。
- 弹窗、表单、上传、列表、空状态、表格等交互重复出现。
- 新页面能明显复用既有组件或共享逻辑。

## Decision

优先复用或抽取，当：

- 结构相同，只是数据、标题、按钮或回调不同。
- 行为相同，只是 API 或展示字段不同。
- 未来还会继续增长，重复维护成本明显。

允许不抽取，当：

- 只出现一次，且未来极不可能复用。
- 交互本质不同，强行统一会制造复杂 props。
- 视觉结构差异较大，统一后反而更难维护。

## Extraction Rules

1. 先检查项目级 `AGENTS.md` 中的组件路径补充。
2. 公共组件优先放入项目约定的 shared 目录。
3. 业务组件放入对应业务域目录。
4. Props 保持父组件可控，例如 `open`、`onOpenChange`、`onSuccess`。
5. 抽取后清理使用方的内联 JSX、冗余 state、handler 和 import。
6. 最后运行与改动匹配的最小校验。
