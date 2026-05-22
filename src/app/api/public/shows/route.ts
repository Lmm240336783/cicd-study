import { NextResponse } from "next/server";
import { listPublicShows } from "@/lib/server/content/store";

/** 返回公开电视剧列表接口：只给前台页面提供已发布的电视剧数据。 */
export async function GET() {
  // 真正的数据库查询和发布状态过滤都在 `listPublicShows()` 里完成。
  return NextResponse.json({ data: await listPublicShows() });
}
