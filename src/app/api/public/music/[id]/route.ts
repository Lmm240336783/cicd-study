import { NextResponse } from "next/server";
import { getPublicMusicById } from "@/lib/server/content/store";

type MusicRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/** 返回公开音乐详情。*/
export async function GET(_: Request, { params }: MusicRouteContext) {
  const { id } = await params;
  const music = await getPublicMusicById(id);

  if (!music) {
    return NextResponse.json({ message: "音乐不存在" }, { status: 404 });
  }

  return NextResponse.json({ data: music });
}
