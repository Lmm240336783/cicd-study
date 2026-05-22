# Shared Antd Components Design

## Goal

封装两个公共组件：支持接口驱动分页的 antd Table，以及可通过 ref 控制打开和关闭的 antd Modal。

## Components

`ApiTable` 放在 `src/components/shared/ApiTable.tsx`，作为 client component。它接收 URL 或函数形式的 `api`，合并 `params`、`page`、`limit` 后请求数据，通过 `transform` 将接口响应转成 `{ list, total }`。组件内置 10、20、30、50 条分页选项，并通过 ref 暴露 `reload`、`init`、`search`。

`RefModal` 放在 `src/components/shared/RefModal.tsx`，作为 client component。它通过 ref 暴露 `open(title, data?)` 和 `close()`。`children` 可为普通节点，也可为函数；函数 children 接收 `open` 传入的数据，没有传入时使用 props 的 `data`。

## Data Flow

`ApiTable` 首次挂载请求第 1 页；翻页时更新页码和 limit；`reload` 保留当前页，`init` 和 `search` 回到第 1 页并可合并新参数。URL api 使用 GET 查询参数请求；函数 api 直接接收合并后的参数。

## Testing

由于当前项目只配置了 Node 内置测试环境，核心请求、分页和 modal 状态逻辑拆到可测试工具文件中，用 `node --test --experimental-strip-types` 覆盖。组件外壳通过 `typecheck` 和 `build` 验证 React/antd 集成。
