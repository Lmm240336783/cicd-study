import { NextResponse } from "next/server";
import { listFeaturedImages, listFeaturedShows } from "@/lib/server/content/store";
import type { HomePublicData } from "@/types";

/** 返回首页接口：一次性打包精选图片和精选电视剧，减少前端首页的请求次数。 */
export async function GET() {
  // 这里先在服务端分别查两组“精选内容”，再合并成首页需要的一个响应结构。
  const payload: HomePublicData = {
    featuredImages: await listFeaturedImages(6),
    featuredShows: await listFeaturedShows(6),
  };

  // `NextResponse.json({ data })` 会把对象序列化成 JSON 返回给浏览器或前端 fetch。
  return NextResponse.json({ data: payload });
}
