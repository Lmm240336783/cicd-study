import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getPublicMusicById, getPublicSingerById, listPublicMusicBySingerId } from "@/lib/server/content/store";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import type { MusicCollectionItem } from "@/types";

type MusicDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const musicFallbacks = [
  "linear-gradient(135deg, #0f172a 0%, #312e81 48%, #0ea5e9 100%)",
  "linear-gradient(135deg, #172554 0%, #7c3aed 50%, #ec4899 100%)",
  "linear-gradient(135deg, #111827 0%, #0f766e 45%, #22c55e 100%)",
  "linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #f472b6 100%)",
];

/** 生成歌曲封面样式。*/
function coverStyle(item: MusicCollectionItem) {
  if (item.coverUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(8, 10, 23, 0.08), rgba(8, 10, 23, 0.34)), url("${item.coverUrl}")`,
    };
  }

  return {
    backgroundImage: musicFallbacks[0],
  };
}

/** 渲染前台音乐详情页。*/
export default async function MusicDetailPage({ params }: MusicDetailPageProps) {
  await connection();

  const { id } = await params;
  const music = await getPublicMusicById(id);

  if (!music) {
    notFound();
  }

  const singer = await getPublicSingerById(music.singerId);

  if (!singer) {
    notFound();
  }

  const relatedSongs = (await listPublicMusicBySingerId(music.singerId)).filter((item) => item.id !== music.id).slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <div className="mb-4">
        <Link href="/music" className="inline-flex rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-[#1f2937] hover:text-white">
          返回音乐列表
        </Link>
      </div>

      <section className={cn(styles.musicDetailShell, "overflow-hidden rounded-[30px] p-3 md:p-5")}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="relative overflow-hidden rounded-[26px] border border-white/10">
            <div className="absolute left-4 top-4 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/72 backdrop-blur">
              Music Pick
            </div>
            <div className="min-h-[420px] bg-cover bg-center bg-no-repeat md:min-h-[620px]" style={coverStyle(music)} />
          </div>

          <aside className="rounded-[26px] border border-white/10 bg-white/6 p-5 text-white backdrop-blur-sm md:p-7">
            <Link href={`/music/singers/${singer.id}`} className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/16">
              去看歌手详情 → {singer.name}
            </Link>

            <div className="mt-8">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#7dd3fc]">Featured Track</p>
              <h1 className="mt-3 text-[2.5rem] font-black leading-[1.04] text-white md:text-[4rem]">{music.title}</h1>
              <p className="mt-5 text-base leading-8 text-white/72 md:text-lg">
                {music.description || "这首歌的详情还在整理中，但已经可以通过歌手页继续顺着听下去。"}
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white/82">{music.album || "单曲"}</span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white/82">{music.genre || "音乐"}</span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white/82">{music.duration || "0:00"}</span>
            </div>

            {relatedSongs.length > 0 ? (
              <section className="mt-8">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-white">同歌手更多歌曲</h2>
                  <Link href={`/music/singers/${singer.id}`} className="text-sm font-black text-[#7dd3fc] transition hover:text-[#a78bfa]">
                    查看歌手页 →
                  </Link>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {relatedSongs.map((item) => (
                    <Link
                      key={item.id}
                      href={`/music/${item.id}`}
                      className={cn(styles.musicTrackCard, "group block overflow-hidden rounded-[18px] bg-white")}
                    >
                      <div
                        className="h-32 bg-cover bg-center bg-no-repeat transition duration-300 group-hover:scale-[1.02]"
                        style={coverStyle(item)}
                      />
                      <div className="space-y-1.5 p-3">
                        <p className="line-clamp-1 text-sm font-black text-slate-950">{item.title}</p>
                        <p className="text-xs text-slate-500">
                          {item.album || "单曲"} · {item.duration || "0:00"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
