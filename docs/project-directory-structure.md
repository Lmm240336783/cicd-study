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
│  │  ├─ client/
│  │  ├─ admin/
│  │  ├─ auth/
│  │  ├─ dashboard/
│  │  ├─ http/
│  │  ├─ openai/
│  │  ├─ server/
│  │  └─ utils/
│  └─ types/
└─ tests/
```

## 维护约定

- 每次新增功能时，先判断它属于客户端还是服务端。
- 客户端能力优先归入 `src/app`、`src/components` 和前端展示逻辑。
- 服务端能力优先归入 `src/app/api`、`src/lib/server` 和其他服务端数据层。
- 功能落地后同步更新本文档，确保目录、入口和职责说明始终反映当前真实结构。

## 说明

- `src/app/(site)`：前台页面和站点布局。
- `src/app/(admin)`：后台页面和后台壳布局。
- `src/app/api`：登录、会话、公开内容、后台 CRUD 接口。
- `src/components/shared`：跨页面复用组件。
- `src/components/site`：前台专用组件，其中 `CollectionEmptyState.tsx` 负责 books、images、shows、music 列表页空数据时的统一展位占位展示；`ImageDetailClient.tsx` 负责图片详情客户端请求壳，`ImageAlbumsListClient.tsx`、`ImageAlbumDetailClient.tsx` 负责支持图片/短视频混排的合集列表与详情客户端请求壳。
- `src/components/admin`：后台专用组件。
- `src/lib/client/tos`：浏览器端 TOS 图书 PDF 分片上传与续传状态管理。
- `src/lib/server/openai`：服务端 OpenAI 能力，当前包含后台 AI 图片生成并显式固定到 `gpt-image-2`。
- `src/lib/server`：只在服务端使用的鉴权、Supabase、内容数据层。
- `src/lib/server/tos`：TOS 服务端配置、STS 临时凭证和图书 PDF 预签名能力。
- `src/types`：接口、内容、表单类型。
- `tests`：核心逻辑和页面行为测试。
- 新增功能时先确认客户端/服务端归属，再把新增目录和入口补进上面的结构与映射里。

## 页面结构映射

### 前台页面 `src/app/(site)`

- `/`：首页，展示精选图片、精选电视剧和推荐歌手小块，入口文件是 `src/app/(site)/page.tsx`。
- `/books`：公开图书列表页，入口文件是 `src/app/(site)/books/page.tsx`。
- `/books/detail?id=<bookId>`：公开图书详情页，入口文件是 `src/app/(site)/books/detail/page.tsx`。
- `/images`：公开图片列表页，入口文件是 `src/app/(site)/images/page.tsx`。
- `/images/[id]`：公开图片详情页，入口文件是 `src/app/(site)/images/[id]/page.tsx`，详情数据由客户端壳请求 `/api/public/images/[id]`。
- `/images/albums`：公开图片合集列表页，入口文件是 `src/app/(site)/images/albums/page.tsx`，列表数据由客户端壳请求 `/api/public/image-albums`。
- `/images/albums/[id]`：公开图片合集详情页，入口文件是 `src/app/(site)/images/albums/[id]/page.tsx`，详情数据由客户端壳请求 `/api/public/image-albums/[id]` 并在前端切换图片。
- `/shows`：公开电视剧列表页，入口文件是 `src/app/(site)/shows/page.tsx`。
- `/shows/[id]`：公开电视剧详情页，入口文件是 `src/app/(site)/shows/[id]/page.tsx`。
- `/music`：公开音乐列表页，入口文件是 `src/app/(site)/music/page.tsx`。
- `/music/[id]`：公开音乐详情页，入口文件是 `src/app/(site)/music/[id]/page.tsx`。
- `/music/singers/[id]`：公开歌手详情页，入口文件是 `src/app/(site)/music/singers/[id]/page.tsx`。
- `src/app/(site)/layout.tsx`：前台统一壳，负责背景、顶部导航和会话态展示。

### 后台页面 `src/app/(admin)`

- `/admin`：后台仪表盘，页面组件是 `AdminDashboard`，入口文件是 `src/app/(admin)/admin/page.tsx`。
- `/admin/books`：图书管理页，页面组件是 `BookManager`，负责图书列表、新增、编辑、删除、封面上传、PDF 上传和发布状态维护。
- `/admin/images`：媒体管理页，页面组件是 `ImageManager`，负责图片/短视频列表、新增、编辑、删除、上传、推荐和上下架。
- `/admin/images/albums`：图片合集管理页，页面组件是 `ImageAlbumManager`，负责合集列表、新增、编辑、删除、图片/短视频顺序和上下架。
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

- `GET /api/public/home`：返回首页精选内容，包含精选图片、精选电视剧和推荐歌手。
- `GET /api/public/books`：返回公开图书列表，只包含已发布图书。
- `GET /api/public/books/[id]`：返回公开图书详情，只包含已发布图书。
- `GET /api/public/books/[id]/pdf`：为前台已发布图书生成一次短时 PDF 预签名访问地址，再重定向到 TOS 私有对象。
- `GET /api/public/images`：返回公开图片列表，只包含已发布图片。
- `GET /api/public/images/[id]`：返回公开图片详情，只包含已发布图片。
- `GET /api/public/image-albums`：返回公开图片合集列表，只包含已发布合集，封面取合集第一张公开图片。
- `GET /api/public/image-albums/[id]`：返回公开图片合集详情，只包含已发布合集和已发布图片列表。
- `GET /api/public/shows`：返回公开电视剧列表，只包含已发布电视剧。
- `GET /api/public/music`：返回公开音乐列表，只包含已发布音乐。
- `GET /api/public/music/[id]`：返回公开音乐详情，只包含已发布音乐。
- `GET /api/public/music/singers/[id]`：返回公开歌手详情和该歌手的歌曲列表。

### 后台管理接口 `src/app/api/admin`

- `GET /api/admin/dashboard`：返回后台仪表盘统计数据。
- `GET /api/admin/books`：返回后台图书全量列表。
- `POST /api/admin/books`：创建图书记录。
- `PATCH /api/admin/books/[id]`：更新指定图书。
- `DELETE /api/admin/books/[id]`：删除指定图书。
- `POST /api/admin/books/upload-session`：为后台图书 PDF 上传申请 TOS 分片上传会话和短时凭证。
- `GET /api/admin/books/[id]/pdf`：为后台图书生成一次短时 PDF 预签名访问地址，再重定向到 TOS 私有对象。
- `GET /api/admin/images`：返回后台图片全量列表。
- `POST /api/admin/images`：创建图片记录。
- `PATCH /api/admin/images/[id]`：更新指定图片。
- `DELETE /api/admin/images/[id]`：删除指定图片。
- `POST /api/admin/images/generate`：调用 `gpt-image-2` 生成图片，上传到 Supabase Storage，并返回可直接落库的公开地址。
- `POST /api/admin/images/upload`：上传图片或短视频到存储并返回公开 URL。
- `GET /api/admin/image-albums`：返回后台图片合集全量列表。
- `POST /api/admin/image-albums`：创建图片合集。
- `GET /api/admin/image-albums/[id]`：返回后台指定图片合集详情。
- `PATCH /api/admin/image-albums/[id]`：更新指定图片合集和图片顺序。
- `DELETE /api/admin/image-albums/[id]`：删除指定图片合集。
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

- 后台页面 `/admin/books` 对应的主要接口是 `/api/admin/books`、`/api/admin/books/[id]`、`/api/admin/books/upload-session`、`/api/admin/books/[id]/pdf`，封面上传复用 `/api/admin/images/upload`。
- 后台页面 `/admin/images` 对应的主要接口是 `/api/admin/images`、`/api/admin/images/[id]`、`/api/admin/images/generate`、`/api/admin/images/upload`、`/api/admin/image-tags*`，其中上传接口同时承接图片和短视频媒体文件。
- 后台页面 `/admin/images/albums` 对应的主要接口是 `/api/admin/image-albums`、`/api/admin/image-albums/[id]`，媒体选择数据复用 `/api/admin/images`。
- 前台图片页 `/images` 仍展示单张公开图片，详情页 `/images/[id]` 先进入客户端壳，再请求 `/api/public/images/[id]`。
- 前台图片合集页 `/images/albums` 和 `/images/albums/[id]` 先进入客户端壳，再分别请求 `/api/public/image-albums`、`/api/public/image-albums/[id]`。
- 后台页面 `/admin/shows` 对应的主要接口是 `/api/admin/shows`、`/api/admin/shows/[id]`、`/api/admin/shows/import`。
- 前台图书页 `/books` 和 `/books/detail?id=<bookId>` 直接依赖服务端图书读取能力与 `/api/public/books*`，PDF 预览实际通过 `/api/public/books/[id]/pdf` 中转到 TOS 私有对象。
- 前台首页 `/` 主要依赖 `/api/public/home`，也会直接使用服务端内容读取能力。
- 前台音乐页 `/music` 和歌手详情页 `/music/singers/[id]` 直接依赖服务端音乐与歌手读取能力。
- 内容数据最终统一收口在 `src/lib/server/content/store.ts`。
- 后台页面和 `/api/admin/*` 都受 `src/proxy.ts` 的登录态保护。

## 当前重点

- 内容读写入口是 `src/lib/server/content/store.ts`。
- 后台守卫入口是 `src/proxy.ts`。
- 站点顶层布局入口是 `src/app/layout.tsx`。
