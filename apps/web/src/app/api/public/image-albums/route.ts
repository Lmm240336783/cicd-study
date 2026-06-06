import { NextResponse } from "next/server";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { listPublicImageAlbums } from "@/lib/server/content/store";

/** 返回公开图片合集列表。 */
export async function GET() {
  try {
    return NextResponse.json({ data: await listPublicImageAlbums() });
  } catch (error) {
    return createContentApiErrorResponse(error, "读取公开图片合集失败", "public/image-albums#get");
  }
}
