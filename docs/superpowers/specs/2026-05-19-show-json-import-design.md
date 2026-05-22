# 电视剧 JSON 导入设计

**日期：** 2026-05-19

**目标：** 在 `admin/shows` 支持通过单个 JSON 文件快速新建电视剧数据，并允许 JSON 中携带本地图片路径，导入时自动上传到 Supabase Storage 后再保存公开 URL。

## 范围

- 仅覆盖后台电视剧“新建”场景。
- 仅支持导入单部电视剧 JSON 对象。
- 保留现有手动填写表单和手动上传图片流程。

## 方案

1. 前端在 `ShowManager` 中新增一个 `导入 JSON` 入口。
2. 用户选择 `.json` 文件后，前端读取文本并解析为对象，再提交到新的后台导入接口。
3. 后台导入接口校验基础字段，并读取：
   - `localPosterPath`
   - `localCarouselPaths`
4. 服务端读取这些本地图片文件，上传到现有 Supabase Storage 桶，获取公开 URL。
5. 后台将上传后的 `posterUrl` / `carouselImages` 与其他电视剧字段一起写入 `shows` 表。

## JSON 结构

```json
{
  "name": "魔女",
  "chineseTitle": "魔女",
  "originalTitle": "마녀",
  "year": 2025,
  "country": "KR",
  "genres": ["悬疑", "奇幻"],
  "rating": 8.1,
  "summary": "简介",
  "recommendReason": "推荐理由",
  "isFeatured": true,
  "status": "draft",
  "localPosterPath": "D:\\谷歌下载内容\\韩剧\\魔女\\poster.jpg",
  "localCarouselPaths": [
    "D:\\谷歌下载内容\\韩剧\\魔女\\backdrop-1.jpg",
    "D:\\谷歌下载内容\\韩剧\\魔女\\backdrop-2.jpg"
  ]
}
```

## 边界

- 不支持一次导入多个电视剧对象。
- 不直接把本地磁盘路径存进数据库。
- 不为部署环境增加兼容分支；默认按当前本地导入方案实现。

## 验证

- 单测覆盖导入 JSON 的字段清洗和请求构造。
- 单测覆盖 `ShowManager` 中出现 `导入 JSON` 入口和本地路径字段名。
- 运行相关测试，不执行 `lint`。
