import { NextResponse } from "next/server";
import { getPublicBookById } from "@/lib/server/content/store";

type PublicBookRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/** 返回公开图书详情。 */
export async function GET(_: Request, { params }: PublicBookRouteContext) {
  const { id } = await params;
  const book = await getPublicBookById(id);

  if (!book) {
    return NextResponse.json({ message: "图书不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: book });
}
