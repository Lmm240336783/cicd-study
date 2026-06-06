import { NextResponse } from "next/server";
import { listPublicBooks } from "@/lib/server/content/store";

/** 返回公开图书列表。 */
export async function GET() {
  return NextResponse.json({ data: await listPublicBooks() });
}
