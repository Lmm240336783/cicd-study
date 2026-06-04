import { NextResponse } from "next/server";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { getPublicImageAlbumById } from "@/lib/server/content/store";

type PublicImageAlbumRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/** 返回公开图片合集详情。 */
export async function GET(_: Request, { params }: PublicImageAlbumRouteContext) {
  const { id } = await params;

  try {
    const album = await getPublicImageAlbumById(id);
    if (!album) {
      return NextResponse.json({ message: "图片合集不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: album });
  } catch (error) {
    return createContentApiErrorResponse(error, "读取图片合集详情失败", "public/image-albums/[id]#get");
  }
}
