import { NextResponse } from "next/server";
import { getPublicImageById } from "@/lib/server/content/store";

type PublicImageRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/** 返回公开图片详情。 */
export async function GET(_: Request, { params }: PublicImageRouteContext) {
  const { id } = await params;
  const image = await getPublicImageById(id);

  if (!image) {
    return NextResponse.json({ message: "图片不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: image });
}
