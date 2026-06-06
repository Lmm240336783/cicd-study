# Next.js 后端与 Supabase 说明

## 用途

本文只维护 `apps/web` 中 Next.js 后端、Supabase、Auth、Storage 和服务端流程的参考信息。项目入口摘要看 `project-quick-brief.md`，目录落点看 `project-directory-structure.md`。

## 后端阅读入口

建议按这个顺序阅读：

1. `apps/web/src/app/api`
2. `apps/web/src/lib/server/auth`
3. `apps/web/src/lib/server/supabase`
4. `apps/web/src/lib/server/content/store.ts`
5. `apps/web/src/lib/server/tos`

## 服务端目录职责

- `apps/web/src/app/api/auth`：登录、注册、退出、会话、找回密码和验证码重置密码。
- `apps/web/src/app/api/public`：前台公开内容接口。
- `apps/web/src/app/api/admin`：后台管理接口。
- `apps/web/src/lib/server/auth`：请求解析、站内 session Cookie、会话签名校验和 Supabase Auth 调用。
- `apps/web/src/lib/server/supabase`：Supabase 普通 client、管理员 client 和基础 CRUD 封装。
- `apps/web/src/lib/server/content`：内容数据访问、字段转换、请求体校验和 fallback mock 数据。
- `apps/web/src/lib/server/tos`：TOS 配置、STS 临时凭证和图书 PDF 预签名。

## Next.js Route Handler

示例路径：`apps/web/src/app/api/auth/login/route.ts`

- `export async function GET()` / `POST(request)`：声明接口请求方法。
- `NextResponse.json(data, { status })`：返回 JSON 响应。
- `request.json()`：读取 JSON 请求体。
- `request.formData()`：读取表单或文件上传请求体。
- `request.cookies.get(name)`：读取请求 Cookie。
- `response.cookies.set(...)`：写入响应 Cookie。

## Supabase client

示例路径：`apps/web/src/lib/server/supabase`

```ts
createClient(supabaseUrl, supabaseKey, options)
```

- 普通 client 使用 `SUPABASE_KEY`，适合公开查询和普通 Auth 操作。
- 管理员 client 使用 `SUPABASE_SECRET_KEY`，适合用户管理、后台写入和 Storage 上传。
- 服务端通常关闭 SDK 浏览器式 session 持久化。

## 表查询与写入

示例路径：`apps/web/src/lib/server/content/store.ts`

```ts
supabase.from("images").select("*")
supabase.from("images").select("*").eq("id", id).maybeSingle()
supabase.from("images").select("*").order("updated_at", { ascending: false })
supabase.from("images").insert(payload).select("*").single()
supabase.from("images").update(payload).eq("id", id).select("*").maybeSingle()
supabase.from("images").delete().eq("id", id)
```

常用语义：

- `from("table")`：选中表。
- `select("*")`：读取字段。
- `eq("field", value)`：等值筛选。
- `order("field", { ascending })`：排序。
- `limit(n)`：限制条数。
- `single()`：期望只返回一条。
- `maybeSingle()`：允许查不到。
- `insert(payload)` / `update(payload)` / `delete()`：写入、更新和删除。

## Auth

示例路径：`apps/web/src/lib/server/auth/supabase.ts`

```ts
supabase.auth.signInWithPassword({ email, password })
supabase.auth.resetPasswordForEmail(email, { redirectTo })
supabase.auth.verifyOtp({ email, token, type: "recovery" })
supabase.auth.updateUser({ password })
adminClient.auth.admin.listUsers({ page, perPage })
adminClient.auth.admin.createUser({...})
adminClient.auth.admin.updateUserById(userId, {...})
```

用途：

- `signInWithPassword`：邮箱密码登录。
- `resetPasswordForEmail`：发送找回密码邮件。
- `verifyOtp`：校验验证码或邮件 token。
- `updateUser`：更新当前 session 对应用户。
- `auth.admin.*`：管理员用户管理能力。

## Storage

示例路径：`apps/web/src/app/api/admin/images/upload/route.ts`

```ts
supabase.storage.from(bucketName).upload(path, fileBody, options)
supabase.storage.from(bucketName).getPublicUrl(path)
```

- `upload`：上传文件到 Storage 桶。
- `getPublicUrl`：生成公开访问地址。

## 当前后端流程

### 登录与会话

1. 前端提交 `/api/auth/login`。
2. Route Handler 解析请求体。
3. Supabase Auth 校验邮箱密码。
4. 登录成功后写入站内 session Cookie。
5. 后续后台请求通过 Cookie 校验登录态。

### 注册与找回密码

1. 注册走 `/api/auth/register`，服务端创建管理员账号并签发站内 session。
2. 找回密码走 `/api/auth/forgot-password`。
3. 验证码重置密码走 `/api/auth/password-reset-otp`。

### 公开内容

1. 前台请求 `/api/public/*`。
2. Route Handler 调用 `apps/web/src/lib/server/content/store.ts`。
3. 数据层只返回已发布或已精选内容。
4. 接口统一包装为 `{ data: ... }` 返回。

### 后台内容管理

1. 后台请求 `/api/admin/*`。
2. Route Handler 先校验后台 Cookie 会话。
3. `GET` 返回后台可管理数据。
4. `POST` / `PATCH` / `DELETE` 校验请求体或参数后写库。
5. 文件上传接口额外调用 Supabase Storage。

### TOS 图书 PDF

1. 后台上传 PDF 时申请 TOS 分片上传会话和短时凭证。
2. 前台访问 PDF 时通过站内接口生成一次短时预签名地址。
3. 私有对象不直接暴露长期公开 URL。

## 维护约定

出现下面任一情况时，更新本文档：

- 新增或删除 `apps/web/src/app/api/*` 接口。
- 修改接口请求方式、返回结构或鉴权方式。
- 新增 Supabase 表操作、Auth 操作或 Storage 操作。
- 新增 `apps/web/src/lib/server/*` 后端能力封装。
- 新增 TOS、OpenAI 或其他服务端外部服务流程。
