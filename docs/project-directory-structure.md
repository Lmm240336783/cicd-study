# 项目目录结构

## 概览

```text
.
├─ docs/
├─ public/
├─ scripts/
├─ src/
│  ├─ app/
│  │  ├─ (site)/
│  │  ├─ (admin)/
│  │  └─ api/
│  ├─ components/
│  │  ├─ shared/
│  │  ├─ site/
│  │  └─ admin/
│  ├─ lib/
│  │  ├─ admin/
│  │  ├─ auth/
│  │  ├─ dashboard/
│  │  ├─ http/
│  │  ├─ server/
│  │  └─ utils/
│  └─ types/
└─ tests/
```

## 说明

- `src/app/(site)`：前台页面和站点布局。
- `src/app/(admin)`：后台页面和后台壳布局。
- `src/app/api`：登录、会话、公开内容、后台 CRUD 接口。
- `src/components/shared`：跨页面复用组件。
- `src/components/site`：前台专用组件。
- `src/components/admin`：后台专用组件。
- `src/lib/server`：只在服务端使用的鉴权、Supabase、内容数据层。
- `src/types`：接口、内容、表单类型。
- `tests`：核心逻辑和页面行为测试。

## 页面结构映射

### 前台页面 `src/app/(site)`

- `/`：首页，展示精选图片和精选电视剧，入口文件是 `src/app/(site)/page.tsx`。
- `/images`：公开图片列表页，入口文件是 `src/app/(site)/images/page.tsx`。
- `/images/[id]`：公开图片详情页，入口文件是 `src/app/(site)/images/[id]/page.tsx`。
- `/shows`：公开电视剧列表页，入口文件是 `src/app/(site)/shows/page.tsx`。
- `/shows/[id]`：公开电视剧详情页，入口文件是 `src/app/(site)/shows/[id]/page.tsx`。
- `src/app/(site)/layout.tsx`：前台统一壳，负责背景、顶部导航和会话态展示。

### 后台页面 `src/app/(admin)`

- `/admin`：后台仪表盘，页面组件是 `AdminDashboard`，入口文件是 `src/app/(admin)/admin/page.tsx`。
- `/admin/images`：图片管理页，页面组件是 `ImageManager`，负责图片列表、新增、编辑、删除、上传、推荐和上下架。
- `/admin/shows`：电视剧管理页，页面组件是 `ShowManager`，负责电视剧列表、新增、编辑、删除、导入、推荐和上下架。
- `src/app/(admin)/layout.tsx`：后台统一壳，挂载 `AdminShell`。
- `src/app/(admin)/admin/loading.tsx`：后台路由加载态。

## 接口结构映射

### 鉴权接口 `src/app/api/auth`

- `POST /api/auth/login`：登录，校验邮箱密码，成功后写入站内会话 Cookie。
- `POST /api/auth/register`：注册管理员账号，成功后直接签发会话 Cookie。
- `POST /api/auth/logout`：退出登录，清理会话 Cookie。
- `GET /api/auth/session`：读取当前登录态，前端据此判断是否已登录。
- `POST /api/auth/forgot-password`：发送找回密码邮件或验证码。
- `POST /api/auth/password-reset-otp`：使用验证码重置密码。

### 公开内容接口 `src/app/api/public`

- `GET /api/public/home`：返回首页精选内容，包含精选图片和精选电视剧。
- `GET /api/public/images`：返回公开图片列表，只包含已发布图片。
- `GET /api/public/shows`：返回公开电视剧列表，只包含已发布电视剧。

### 后台管理接口 `src/app/api/admin`

- `GET /api/admin/dashboard`：返回后台仪表盘统计数据。
- `GET /api/admin/images`：返回后台图片全量列表。
- `POST /api/admin/images`：创建图片记录。
- `PATCH /api/admin/images/[id]`：更新指定图片。
- `DELETE /api/admin/images/[id]`：删除指定图片。
- `POST /api/admin/images/upload`：上传图片到存储并返回公开 URL。
- `GET /api/admin/image-tags`：返回图片标签字典。
- `POST /api/admin/image-tags`：创建图片标签。
- `PATCH /api/admin/image-tags/[id]`：更新图片标签。
- `DELETE /api/admin/image-tags/[id]`：删除图片标签。
- `GET /api/admin/shows`：返回后台电视剧全量列表。
- `POST /api/admin/shows`：创建电视剧记录。
- `PATCH /api/admin/shows/[id]`：更新指定电视剧。
- `DELETE /api/admin/shows/[id]`：删除指定电视剧。
- `POST /api/admin/shows/import`：按导入 JSON 创建电视剧，并可把本地图片路径转成正式图片 URL。

## 关键对应关系

- 后台页面 `/admin/images` 对应的主要接口是 `/api/admin/images`、`/api/admin/images/[id]`、`/api/admin/images/upload`、`/api/admin/image-tags*`。
- 后台页面 `/admin/shows` 对应的主要接口是 `/api/admin/shows`、`/api/admin/shows/[id]`、`/api/admin/shows/import`。
- 前台首页 `/` 主要依赖 `/api/public/home`，也会直接使用服务端内容读取能力。
- 内容数据最终统一收口在 `src/lib/server/content/store.ts`。
- 后台页面和 `/api/admin/*` 都受 `src/proxy.ts` 的登录态保护。

## 当前重点

- 内容读写入口是 `src/lib/server/content/store.ts`。
- 后台守卫入口是 `src/proxy.ts`。
- 站点顶层布局入口是 `src/app/layout.tsx`。
