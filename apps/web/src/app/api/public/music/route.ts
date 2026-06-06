import { NextResponse } from "next/server";
import { listPublicMusic } from "@/lib/server/content/store";

/** 返回公开音乐列表。*/
export async function GET() {
  return NextResponse.json({ data: await listPublicMusic() });
}
