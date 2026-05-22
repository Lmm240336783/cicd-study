# Next.js 后端与 Supabase 说明

## 目的

这份文档用来快速说明本项目里和 Next.js 后端、Supabase 相关的核心入口、常见语法和职责分工。

阅读顺序建议：

1. `src/lib/server/supabase/*`
2. `src/lib/server/auth/*`
3. `src/lib/server/content/store.ts`
4. `src/app/api/*`

## 目录职责

### `src/lib/server/supabase`

- `core.ts`
  负责创建 Supabase client，并封装最基础的表 CRUD 语法。
- `public.ts`
  负责创建使用 `SUPABASE_KEY` 的普通 client，适合公开查询和普通 Auth 操作。
- `admin.ts`
  负责创建使用 `SUPABASE_SECRET_KEY` 的管理员 client，适合用户管理、后台写入、Storage 上传。

### `src/lib/server/auth`

- `request.ts`
  负责解析登录、注册、找回密码、验证码重置密码请求。
- `cookie.ts`
  负责写入、清理、读取站内 session Cookie。
- `session.ts`
  负责会话 token 的签名、校验，以及鉴权失败文案归一化。
- `supabase.ts`
  负责真正调用 Supabase Auth，包括登录、注册、找回密码、验证码校验、重置密码。

### `src/lib/server/content`

- `store.ts`
  负责图片和电视剧的增删改查，是内容表的主要数据访问层。
- `records.ts`
  负责数据库字段和前端字段之间的转换。
- `fallback.ts`
  负责内容表不可用时的兜底 mock 数据。

### `src/app/api`

- `api/auth/*`
  负责登录、注册、找回密码、验证码重置密码、退出登录、读取当前 session。
- `api/public/*`
  负责前台公开数据接口，例如首页精选、公开图片列表、公开电视剧列表。
- `api/admin/*`
  负责后台数据管理接口和图片上传接口，例如后台图片列表、新建图片、后台电视剧列表、新建电视剧。

## Next.js 后端常见写法

### Route Handler

示例：`src/app/api/auth/login/route.ts`

- `export async function POST(request: NextRequest)`:
  表示这是一个处理 `POST` 请求的 Next.js Route Handler。
- `NextResponse.json(data, { status })`:
  返回 JSON 响应，并可附带状态码。

### 读取请求体

示例：`src/lib/server/auth/request.ts`

- `await request.json()`
  适合读取 `application/json` 请求体。
- `await request.formData()`
  适合读取表单提交、文件上传请求。
- `request.headers.get("content-type")`
  用来判断前端到底是按 JSON 还是表单提交。

### 读写 Cookie

示例：`src/lib/server/auth/cookie.ts`

- `response.cookies.set(...)`
  往响应里写 Cookie，浏览器收到响应后会自动保存。
- `request.cookies.get(name)`
  从当前请求里读取浏览器带来的 Cookie。
- `await cookies()`
  在 Server Component 或服务端环境中读取 Cookie Store。

## Supabase 常见写法

### 创建 client

示例：`src/lib/server/supabase/core.ts`

```ts
createClient(supabaseUrl, supabaseKey, options)
```

- `supabaseUrl`
  你的 Supabase 项目地址。
- `supabaseKey`
  匿名 key 或服务端 secret key。
- `options.auth.persistSession`
  服务端通常关掉，不让 SDK 自己接管浏览器式登录状态。

### 表查询

示例：`src/lib/server/content/store.ts`

```ts
supabase.from("images").select("*")
supabase.from("images").select("*").eq("id", id).maybeSingle()
supabase.from("images").select("*").order("updated_at", { ascending: false })
```

- `from("table")`
  选中某张表。
- `select("*")`
  读取字段。
- `eq("field", value)`
  加等值筛选。
- `order("field", { ascending: false })`
  按字段排序。
- `limit(n)`
  限制条数。
- `single()`
  期望只返回一条，不是单条时会报错。
- `maybeSingle()`
  允许查不到，查不到时返回 `null` 风格结果。

### 表写入

```ts
supabase.from("images").insert(payload).select("*").single()
supabase.from("images").update(payload).eq("id", id).select("*").maybeSingle()
supabase.from("images").delete().eq("id", id)
```

- `insert(payload)`
  新增记录。
- `update(payload)`
  更新记录。
- `delete()`
  删除记录。
- `select("*")`
  写入后把完整记录再读回来。

### Auth

示例：`src/lib/server/auth/supabase.ts`

```ts
supabase.auth.signInWithPassword({ email, password })
supabase.auth.resetPasswordForEmail(email, { redirectTo })
supabase.auth.verifyOtp({ email, token, type: "recovery" })
supabase.auth.updateUser({ password })
```

- `signInWithPassword`
  邮箱密码登录。
- `resetPasswordForEmail`
  发送找回密码邮件。
- `verifyOtp`
  校验验证码或邮件里的 token。
- `updateUser`
  更新“当前 session 对应用户”的资料，比如密码。

### Admin Auth

```ts
adminClient.auth.admin.listUsers({ page, perPage })
adminClient.auth.admin.createUser({...})
adminClient.auth.admin.updateUserById(userId, {...})
```

- `listUsers`
  管理员查看用户列表。
- `createUser`
  服务端直接创建用户。
- `updateUserById`
  按用户 id 修改资料。

### Storage

示例：`src/app/api/admin/images/upload/route.ts`

```ts
supabase.storage.from(bucketName).upload(path, fileBody, options)
supabase.storage.from(bucketName).getPublicUrl(path)
```

- `upload`
  上传文件到 Storage 桶。
- `getPublicUrl`
  生成公开访问地址。

## 当前项目里的主要后端流程

### 登录流程

1. 前端提交 `/api/auth/login`
2. `request.ts` 解析请求体
3. `supabase.ts` 调用 `signInWithPassword`
4. 登录成功后 `cookie.ts` 把站内 session 写进 Cookie
5. 后续后台请求通过 Cookie 校验登录态

### 注册流程

1. 前端提交 `/api/auth/register`
2. `request.ts` 解析请求体
3. `supabase.ts` 调用 `auth.admin.createUser`
4. 创建成功后自动再登录一次
5. 写入站内 session Cookie

### 找回密码流程

1. 前端提交 `/api/auth/forgot-password`
2. `request.ts` 解析邮箱
3. `supabase.ts` 调用 `resetPasswordForEmail`
4. Supabase 给目标邮箱发送找回密码邮件或验证码

### 验证码重置密码流程

1. 前端提交 `/api/auth/password-reset-otp`
2. `request.ts` 解析邮箱和验证码
3. `supabase.ts` 调用 `verifyOtp`
4. 校验通过后再调用 `updateUser({ password })`
5. 目标账号密码被重置为当前项目定义的默认值

### 读取当前 session 流程

1. 前端请求 `/api/auth/session`
2. Route Handler 从请求 Cookie 中读取站内 session
3. 有效就返回用户信息，无效就返回 `{ data: null }`

### 退出登录流程

1. 前端请求 `/api/auth/logout`
2. Route Handler 创建一个响应对象
3. `cookie.ts` 清掉会话 Cookie
4. 返回退出成功结果

### 公开列表流程

1. 前端请求 `/api/public/home`、`/api/public/images` 或 `/api/public/shows`
2. Route Handler 调用 `content/store.ts`
3. `store.ts` 只返回已发布或已精选的数据
4. 接口把结果包装成 `{ data: ... }` 返回给前端

### 后台列表与创建流程

1. 前端请求 `/api/admin/images` 或 `/api/admin/shows`
2. Route Handler 先校验后台 Cookie 会话
3. `GET` 走后台列表查询，返回所有可管理内容
4. `POST` 先读取并校验 JSON 请求体，再调用 `createImage()` / `createShow()` 写库
5. 创建成功后返回 `201`

### 图片上传流程

1. 前端向 `/api/admin/images/upload` 发送 `FormData`
2. Route Handler 校验后台登录态
3. 读取 `file`
4. 调用 `storage.upload(...)`
5. 上传成功后返回公开 URL

### 内容 CRUD 流程

1. Route Handler 校验会话或参数
2. 调用 `content/store.ts`
3. `store.ts` 用 Supabase 表语法操作 `images` / `shows`
4. 再把数据库记录转换成前端需要的字段结构返回

## 维护约定

以后只要出现下面任一情况，都要同步更新这份文档：

- 新增 `src/app/api/*` 接口
- 修改已有接口的请求方式、返回结构或鉴权方式
- 新增 Supabase 表操作、Auth 操作、Storage 操作
- 新增新的 `src/lib/server/*` 后端能力封装

更新时至少补充三类信息：

1. 文件路径和职责
2. 用到的 Next.js / Supabase 关键语法
3. 这条接口或能力在项目里的调用流程
