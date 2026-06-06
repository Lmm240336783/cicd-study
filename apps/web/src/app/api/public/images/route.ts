import { NextResponse } from "next/server";
import { listPublicImages } from "@/lib/server/content/store";

/** 返回公开图片列表接口：只给前台页面提供已发布的图片数据。 */
export async function GET() {
  // 实际的筛选逻辑放在 `listPublicImages()` 里，这里只负责把结果包装成标准 JSON 响应。
  return NextResponse.json({ data: await listPublicImages() });
}
