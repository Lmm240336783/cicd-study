import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getPublicSingerById, listPublicMusicBySingerId } from "@/lib/server/content/store";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import type { MusicCollectionItem, SingerCollectionItem } from "@/types";

type SingerDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const portraitFallbacks = [
  "linear-gradient(135deg, #312e81 0%, #7c3aed 50%, #f472b6 100%)",
  "linear-gradient(135deg, #0f172a 0%, #0ea5e9 50%, #22c55e 100%)",
  "linear-gradient(135deg, #111827 0%, #ec4899 45%, #f59e0b 100%)",
  "linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #a78bfa 100%)",
];

/** 生成歌手照片样式。*/
function portraitStyle(item: SingerCollectionItem, index: number) {
  if (item.photoUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(18, 16, 32, 0.06), rgba(18, 16, 32, 0.24)), url("${item.photoUrl}")`,
    };
  }

  return {
    backgroundImage: portraitFallbacks[index % portraitFallbacks.length],
  };
}

/** 生成歌曲封面样式。*/
function songCoverStyle(item: MusicCollectionItem, index: number) {
  if (item.coverUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(8, 10, 23, 0.06), rgba(8, 10, 23, 0.24)), url("${item.coverUrl}")`,
    };
  }

  return {
    backgroundImage: portraitFallbacks[index % portraitFallbacks.length],
  };
}

/** 渲染歌手详情页。*/
export default async function SingerDetailPage({ params }: SingerDetailPageProps) {
  await connection();

  const { id } = await params;
  const singer = await getPublicSingerById(id);

  if (!singer) {
    notFound();
  }

  const songs = await listPublicMusicBySingerId(id);

  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <div className="mb-4">
        <Link href="/music" className="inline-flex rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-[#1f2937] hover:text-white">
          返回音乐列表
        </Link>
      </div>

      <section className={cn(styles.musicSurface, "overflow-hidden rounded-[30px] p-3 md:p-5")}>
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[26px] border border-[#d8e0ff] bg-white">
            <div className="h-[420px] bg-cover bg-center bg-no-repeat md:h-[560px]" style={portraitStyle(singer, 0)} />
          </div>

          <div className="rounded-[26px] border border-[#d8e0ff] bg-white/90 p-5 md:p-7">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7360d6]">Singer Profile</p>
            <h1 className="mt-3 text-[2.6rem] font-black leading-tight text-slate-950 md:text-[4rem]">{singer.name}</h1>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-950">歌曲列表</h2>
                <span className={cn(styles.countPill, "px-3 py-1 text-xs")}>{songs.length} 首</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {songs.length > 0 ? (
                  songs.map((item, index) => (
                    <Link
                      key={item.id}
                      href={`/music/${item.id}`}
                      className={cn(styles.musicTrackCard, "group block overflow-hidden rounded-[18px]")}
                    >
                      <div
                        className="h-36 bg-cover bg-center bg-no-repeat transition duration-300 group-hover:scale-[1.02]"
                        style={songCoverStyle(item, index)}
                      />
                      <div className="space-y-1.5 p-3">
                        <p className="line-clamp-1 text-sm font-black text-slate-950">{item.title}</p>
                        <p className="text-xs text-slate-500">
                          {item.album || "单曲"} · {item.duration || "0:00"}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-[#d8e0ff] px-4 py-8 text-sm text-slate-500">
                    暂时还没有收录这位歌手的歌曲。
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
