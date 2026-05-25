# 图书管理模块设计

**日期：** 2026-05-25

**目标：** 新增一个图书管理模块，支持后台上传和维护图书信息与 PDF 文件，并在前台提供公开图书列表与图书详情页，在详情页内直接查看完整 PDF 内容。

## 范围

- 新增后台图书管理页 `src/app/(admin)/admin/books/page.tsx`。
- 新增前台图书列表页 `src/app/(site)/books/page.tsx`。
- 新增前台图书详情页 `src/app/(site)/books/[id]/page.tsx`。
- 新增图书后台 CRUD 接口、公开查询接口和 PDF 上传接口。
- 新增图书内容类型、记录映射和服务端读写能力。
- 不包含作者、分类、标签、推荐位、出版年份、ISBN、出版社、页数、语言和系列信息。

## 已确认决策

1. 图书模块同时覆盖后台管理和前台公开访问。
2. 前台详情页直接展示完整 PDF，不做试读版与完整版区分。
3. 后台只负责上传和维护图书记录，不在后台做复杂阅读器。
4. 图书信息采用最小模型，仅包含：
   - 书名
   - 封面
   - 简介
   - PDF 文件
   - 发布状态
5. PDF 详情预览优先采用浏览器原生内嵌方案，不引入 `react-pdf` 或 `pdf.js` 自建阅读器。
6. 默认不增加兼容分支、降级分支或过渡方案，直接按新模块形态落地。

## 方案选择

### 推荐方案

- 后台上传 PDF 并保存公开 `pdfUrl`。
- 前台详情页使用原生 `iframe` 或 `object` 内嵌 PDF。
- 页面同时提供“新窗口打开 PDF”按钮，作为阅读入口补充。

### 选择理由

- 当前项目没有 PDF 阅读依赖，原生嵌入方案实现成本最低。
- 方案与现有图片上传和公开 URL 访问方式最接近，容易复用项目已有模式。
- 当前需求只要求“前台能查看完整 PDF”，不要求页码控制、搜索、缩放工具栏等高级阅读能力。

### 不采用的方案

- 不引入 `react-pdf` 或 `pdf.js` 自建阅读器。
- 不做前台试读、后台完整阅读的双文件方案。
- 不做弹层阅读器，优先使用详情页内嵌阅读区。

## 数据模型

### 前端内容类型

新增 `BookCollectionItem`：

- `id: string`
- `title: string`
- `coverUrl: string`
- `description: string`
- `pdfUrl: string`
- `status: "draft" | "published"`
- `createdAt: string`
- `updatedAt: string`

### 表单与接口类型

新增：

- `CreateBookPayload`
- `UpdateBookPayload`

字段约束：

- `title` 必填。
- `coverUrl` 新建时必填。
- `pdfUrl` 新建时必填。
- `description` 可选，落库时转为空字符串。
- `status` 仅允许 `draft` 或 `published`。

### 数据库记录

新增 `books` 表，字段建议为：

- `id`
- `title`
- `cover_url`
- `description`
- `pdf_url`
- `status`
- `created_at`
- `updated_at`

字段命名和现有 `images`、`shows` 保持一致，数据库层继续使用 snake_case，前端模型继续使用 camelCase。

## 路由与接口设计

### 后台页面

- `/admin/books`
  - 入口文件：`src/app/(admin)/admin/books/page.tsx`
  - 页面组件：`BookManager`

### 前台页面

- `/books`
  - 展示所有已发布图书
- `/books/[id]`
  - 展示单本已发布图书详情和 PDF 阅读区

### 后台接口

- `GET /api/admin/books`
  - 返回后台图书全量列表
- `POST /api/admin/books`
  - 新建图书
- `PATCH /api/admin/books/[id]`
  - 更新图书
- `DELETE /api/admin/books/[id]`
  - 删除图书
- `POST /api/admin/books/upload-pdf`
  - 上传 PDF 并返回公开 URL

### 公开接口

- `GET /api/public/books`
  - 返回所有已发布图书
- `GET /api/public/books/[id]`
  - 返回单本已发布图书详情

公开接口的过滤规则与现有 `images/shows` 保持一致，只暴露 `published` 内容。

## 服务端能力设计

### `src/lib/server/content/store.ts`

新增：

- `listPublicBooks`
- `getPublicBookById`
- `listAdminBooks`
- `createBook`
- `updateBookById`
- `deleteBookById`

### `src/lib/server/content/records.ts`

新增：

- `BookRecord`
- `BookWriteRecord`
- `bookRecordToItem`
- `bookPayloadToInsertRecord`
- `bookPayloadToUpdateRecord`

图书记录映射与 `images/shows` 保持同一风格：

- 空字符串字段在读取时兜成可直接渲染的字符串。
- 更新时继续移除 `undefined` 字段，避免误覆盖数据库默认值。

## 存储与上传设计

### 封面上传

- 复用现有图片上传模式。
- 后台图书表单中的封面继续走现有图片上传接口和公开 URL 返回逻辑。
- 不新增图书封面专用上传接口。

### PDF 上传

- 新增服务端上传能力，沿用当前 Supabase Storage 公共 URL 方案。
- PDF 文件存储目录与现有图片目录分开，建议使用 `admin-book-pdfs/`。

### 上传约束

- 仅允许 `application/pdf`。
- 服务端为 PDF 生成安全文件名。
- 返回结构继续使用：
  - `path`
  - `url`

## 后台页面设计

### 页面结构

后台图书管理延续现有 `ImageManager` / `ShowManager` 模式：

- 顶部说明区
- 图书列表区
- 新增/编辑共用弹窗

### 列表字段

后台列表最小列集：

- 书名
- 发布状态
- 更新时间
- 操作

### 表单字段

新增和编辑共用表单包含：

- 书名
- 上传封面
- 简介
- 上传 PDF
- 发布状态

### 后台交互

- 支持新增图书
- 支持编辑图书
- 支持删除图书
- 支持替换封面
- 支持替换 PDF
- 支持保存后刷新列表并显示成功提示

## 前台页面设计

### 图书列表页 `/books`

- 展示所有已发布图书。
- 每张卡片显示：
  - 封面
  - 书名
  - 简介摘要
- 点击卡片进入图书详情页。

列表视觉应跟随当前站点“内容馆”风格，不额外引入全新设计语言。

### 图书详情页 `/books/[id]`

详情页包含两部分：

1. 图书信息区
   - 返回列表按钮
   - 封面
   - 书名
   - 简介
2. PDF 阅读区
   - 原生内嵌 PDF 容器
   - 新窗口打开 PDF 按钮

详情页优先保证“可阅读”和“可打开原文件”，而不是定制阅读工具。

## 权限与可见性规则

- 后台所有 `admin/books*` 接口沿用当前管理员会话校验方式。
- 前台列表与详情页只暴露 `published` 图书。
- `draft` 图书只允许在后台看到和维护。
- 访问不存在图书或未发布图书时，前台页面直接 `notFound()`。

## 异常处理

### 后台

- 书名为空时不允许提交。
- 新建图书时缺少封面或 PDF 时不允许提交。
- 上传非 PDF 文件时直接报错。
- 更新不存在的图书时返回 404。

### 前台

- 图书不存在或未发布时进入 404。
- PDF 内嵌失败时，页面仍保留书籍基本信息。
- 页面给出明确提示，并保留“新窗口打开 PDF”入口。

## 非目标

- 不做作者字段。
- 不做分类、标签和筛选。
- 不做首页推荐。
- 不做导入 JSON。
- 不做多文件附件。
- 不做 PDF 页码、缩放、搜索、自定义工具栏和批注。
- 不做下载权限、阅读次数统计和访问审计。

## 验证

- 增加图书内容映射与 `store.ts` 的相关测试。
- 增加后台图书接口参数校验测试。
- 增加公开图书列表与详情只返回 `published` 内容的测试。
- 增加后台导航新增“图书管理”后的匹配测试。
- 增加前台图书页面的基础渲染与 404 行为测试。
- 本次设计阶段只输出文档，不修改业务代码。
