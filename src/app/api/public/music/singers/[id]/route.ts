import { NextResponse } from "next/server";
import { getPublicSingerById, listPublicMusicBySingerId } from "@/lib/server/content/store";

type SingerRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/** 返回公开歌手详情和其歌曲列表。*/
export async function GET(_: Request, { params }: SingerRouteContext) {
  const { id } = await params;
  const singer = await getPublicSingerById(id);

  if (!singer) {
    return NextResponse.json({ message: "歌手不存在" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      singer,
      songs: await listPublicMusicBySingerId(id),
    },
  });
}
