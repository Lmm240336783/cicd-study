# src/lib 职责说明

`src/lib` 用于放置跨页面、跨组件复用的基础能力。后续新增文件时，先判断职责，再放入对应子目录；不要继续把新文件平铺在 `src/lib` 根目录。

页面 UI 组件仍放在 `src/components/shared` 或 `src/components/<domain>`，`src/lib` 只放配置、工具、请求、服务端数据访问和数据适配等非组件能力。

## 目录划分

| 目录 | 职责 | 当前文件 |
| --- | --- | --- |
| `admin` | 后台页面展示配置，如菜单、后台路由文案、后台导航匹配。 | `navigation.tsx` |
| `auth` | 浏览器端鉴权请求适配，负责组装 Auth 接口地址、请求体和错误文案。 | `client.ts` |
| `utils` | 通用纯工具函数，避免耦合业务状态。 | `cn.ts` |
| `http` | 通用 HTTP 请求基础设施，包括请求实例、客户端封装和浏览器 token 读写。 | `client.ts`、`request.ts`、`token.ts` |
| `dashboard` | 仪表盘展示数据或临时 mock 数据。 | `mock.ts` |
| `server/auth` | 服务端鉴权、会话 Cookie、请求解析和 Supabase Auth 业务封装。 | `cookie.ts`、`request.ts`、`session.ts`、`supabase.ts` |
| `server/supabase` | Supabase 底层客户端工厂和 public/admin client 出口。 | `core.ts`、`public.ts`、`admin.ts` |
| `server/content` | 图片和电视剧内容数据访问、字段转换和内容兜底数据。 | `store.ts`、`records.ts`、`fallback.ts` |

## 文件职责

| 文件 | 职责 | 当前使用情况 |
| --- | --- | --- |
| `admin/navigation.tsx` | 后台菜单展示配置，包含菜单分组、路由文案、图标和基于路径匹配当前菜单的方法。 | 被 `src/components/admin/AdminShell.tsx` 使用。 |
| `auth/client.ts` | 浏览器端 Auth 请求适配，负责登录、注册、找回密码、验证码重置密码的接口地址、请求体和错误文案。 | 被 `src/components/site/AuthModal.tsx` 使用。 |
| `utils/cn.ts` | 通用 className 拼接工具，过滤空值后合并 Tailwind class 和 CSS Module class。 | 被站点页面、站点组件、后台壳组件和 `BrandMark` 使用。 |
| `http/client.ts` | 通用 HTTP 客户端封装，负责请求方法、URL/query 拼接、body 规范化、响应解析、错误封装和 token 请求头注入。 | 仅被 `http/request.ts` 引用，当前没有业务入口直接使用。 |
| `http/request.ts` | 默认请求实例出口，导出 `x` 和 HTTP 客户端类型，预期统一通过 `x.get`、`x.post` 等方法发请求。 | 当前未被业务代码导入。 |
| `http/token.ts` | 浏览器端 localStorage token 读写工具，供 HTTP 客户端注入 Authorization 请求头。 | 仅被 `http/client.ts` 引用；由于 HTTP 封装当前未进入业务调用链，实际业务暂未使用。 |
| `dashboard/mock.ts` | 旧后台仪表盘展示用 mock 数据，包括快捷操作、提醒、推广卡片和帮助链接。 | 当前未检索到业务引用。 |

## server 子目录

`src/lib/server` 仅放服务端能力，文件中使用 `server-only` 的模块不得被客户端组件导入。

| 文件 | 职责 |
| --- | --- |
| `server/auth/cookie.ts` | 站内会话 Cookie 的写入、清理和读取入口，并转出会话相关类型与方法。 |
| `server/auth/request.ts` | 服务端 Auth API 请求参数解析，支持 JSON、urlencoded 和 multipart form 数据。 |
| `server/auth/session.ts` | 站内会话模型、签名令牌、令牌校验、鉴权参数规范化和鉴权错误文案归一化。 |
| `server/auth/supabase.ts` | Supabase Auth 业务封装，负责登录、注册、发送找回密码邮件、验证码重置密码和 Supabase session 到站内 session 的转换。 |
| `server/supabase/core.ts` | Supabase 底层公共工厂，负责读取环境变量、创建客户端和生成标准表操作。 |
| `server/supabase/public.ts` | 官网只读场景的 Supabase public client 出口，使用 `SUPABASE_KEY`。 |
| `server/supabase/admin.ts` | 后台管理场景的 Supabase admin client 出口，使用 `SUPABASE_SECRET_KEY`。 |
| `server/content/store.ts` | 图片和电视剧内容数据访问层，负责公开列表、后台列表、精选、新增、更新、删除。 |
| `server/content/records.ts` | Supabase snake_case 记录和前端 camelCase 模型之间的类型与字段转换。 |
| `server/content/fallback.ts` | 内容表缺失时的兜底展示数据，供 `server/content/store.ts` 使用。 |

## 职责边界

- 页面展示配置：放在 `admin` 等领域目录中，只描述菜单、文案、路径、图标等展示信息。
- 客户端请求适配：放在对应业务目录中，例如 `auth/client.ts`，负责组装参数和处理前端可读错误，不直接持有服务端密钥。
- 通用工具函数：放在 `utils`，保持纯函数和低耦合，避免夹带业务状态。
- 请求基础设施：放在 `http`，如果后续接入，需要统一从 `http/request.ts` 导出的 `x` 发起请求。
- 服务端基础设施：放在 `server/*`，只服务 API Route、Server Component 或其他服务端模块，避免被客户端组件导入。
- 数据适配：`server/content/records.ts` 只做字段转换，`server/content/store.ts` 负责数据读写流程，`server/content/fallback.ts` 只提供兜底数据。

## 当前待确认

- `http/request.ts` 已封装默认请求实例，但当前没有业务代码导入。
- `http/token.ts` 已封装 localStorage token 读写，但当前只被未进入业务调用链的 `http/client.ts` 间接使用。
- 现有 Auth 表单仍直接使用 `auth/client.ts` 内的 `fetch` 调用站内 `/api/auth/*`，没有走 `http/request.ts` 的 `x` 实例。
