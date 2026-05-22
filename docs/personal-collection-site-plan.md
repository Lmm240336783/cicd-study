# 个人收藏网站实施方案（Next.js 16）

## 1. 目标

搭建一个“前台展示 + 后台管理”的个人收藏网站，首期只做两类内容：

- 图片收藏
- 电视剧推荐

站点部署在 Vercel，并绑定自定义域名。

## 2. 首期范围

### 前台

- 首页展示精选图片和精选电视剧
- 图片列表页 `/images`
- 电视剧列表页 `/shows`
- 详情页 `/images/[id]`、`/shows/[id]`
- 未登录显示登录入口，已登录显示后台入口

### 后台

- 仪表盘：展示内容总数和最近更新
- 图片管理：新增、编辑、删除、上下架、推荐
- 电视剧管理：新增、编辑、删除、上下架、推荐

## 3. 路由与接口

- 前台路由放在 `src/app/(site)`。
- 后台路由放在 `src/app/(admin)`。
- API 路由统一放在 `src/app/api/**/route.ts`。
- 鉴权接口：`/api/auth/login`、`/api/auth/logout`、`/api/auth/session`
- 前台接口：`/api/public/home`、`/api/public/images`、`/api/public/shows`
- 后台接口：`/api/admin/images`、`/api/admin/shows` 及对应的 `:id` 操作

## 4. 数据与技术

- App Router + Route Handlers
- Supabase 负责 Auth、内容数据和存储
- 会话使用 `HttpOnly Cookie`
- 公共类型放在 `src/types`
- 服务端能力放在 `src/lib/server`

## 5. 目录结构

详见 [项目目录结构](./project-directory-structure.md)。

## 6. 部署

- GitHub 推送后由 Vercel 自动部署
- 按环境配置鉴权和数据库变量
- 上线后检查登录、后台权限、CRUD 和图片加载

## 7. 交付顺序

1. 完成前台页面骨架和路由
2. 完成后台页面骨架和导航
3. 完成登录与会话校验
4. 打通内容读取
5. 完成后台 CRUD
6. 部署到 Vercel 并绑定域名
