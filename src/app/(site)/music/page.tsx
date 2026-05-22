import Link from "next/link";
import { connection } from "next/server";
import { listFeaturedSingers, listPublicMusic, listPublicSingers } from "@/lib/server/content/store";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import type { MusicCollectionItem, SingerCollectionItem } from "@/types";

const musicFallbacks = [
  "linear-gradient(135deg, #0f172a 0%, #312e81 48%, #0ea5e9 100%)",
  "linear-gradient(135deg, #172554 0%, #7c3aed 50%, #ec4899 100%)",
  "linear-gradient(135deg, #111827 0%, #0f766e 45%, #22c55e 100%)",
  "linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #f472b6 100%)",
];

/** 生成歌曲封面样式。*/
function coverStyle(item: MusicCollectionItem, index: number) {
  if (item.coverUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(6, 10, 23, 0.08), rgba(6, 10, 23, 0.34)), url("${item.coverUrl}")`,
    };
  }

  return {
    backgroundImage: musicFallbacks[index % musicFallbacks.length],
  };
}

/** 生成歌手头像样式。*/
function singerStyle(item: SingerCollectionItem, index: number) {
  if (item.photoUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(18, 16, 32, 0.04), rgba(18, 16, 32, 0.24)), url("${item.photoUrl}")`,
    };
  }

  return {
    backgroundImage: musicFallbacks[(index + 1) % musicFallbacks.length],
  };
}

/** 渲染歌曲卡片。*/
function MusicCard({
  item,
  singerName,
  singerHref,
  index,
}: {
  item: MusicCollectionItem;
  singerName: string;
  singerHref: string;
  index: number;
}) {
  return (
    <article className={cn(styles.musicTrackCard, "group overflow-hidden rounded-[18px]")}>
      <Link href={`/music/${item.id}`} className="block">
        <div className={cn("h-[192px] bg-cover bg-center bg-no-repeat transition duration-300 group-hover:scale-[1.02]")} style={coverStyle(item, index)} />
      </Link>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-slate-950">{item.title}</h2>
            <Link href={singerHref} className="mt-1 inline-flex text-sm font-semibold text-[#7360d6] transition hover:text-[#5742b9]">
              {singerName}
            </Link>
          </div>
          <span className="shrink-0 rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] font-black text-slate-700">
            {item.duration || "0:00"}
          </span>
        </div>

        <p className="text-xs text-slate-500">
          {item.album || "单曲"} · {item.genre || "音乐"}
        </p>
        <p className="line-clamp-2 text-sm leading-6 text-slate-600">
          {item.description || "点开可以查看这首歌的详情和关联歌手。"}
        </p>
      </div>
    </article>
  );
}

/** 渲染歌手小卡。*/
function SingerCard({ item, index }: { item: SingerCollectionItem; index: number }) {
  return (
    <Link href={`/music/singers/${item.id}`} className={cn(styles.musicSingerCard, "group block overflow-hidden rounded-[18px]")}>
      <div className={cn("h-[144px] bg-cover bg-center bg-no-repeat", styles.mediaCardPlain)} style={singerStyle(item, index)} />
      <div className="space-y-1.5 px-4 py-3">
        <p className="line-clamp-1 text-sm font-black text-slate-950">{item.name}</p>
        <p className="text-xs text-slate-500">点开查看歌单</p>
      </div>
    </Link>
  );
}

/** 渲染前台音乐列表页。*/
export default async function MusicPage() {
  await connection();

  const [music, singers, featuredSingers] = await Promise.all([listPublicMusic(), listPublicSingers(), listFeaturedSingers(4)]);
  const singerMap = new Map(singers.map((item) => [item.id, item]));
  const spotlightSong = music[0];

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.surfacePanel, "overflow-hidden rounded-[30px] p-3 md:p-4")}>
        <header className={cn(styles.listHeader, "rounded-[22px] px-5 py-4")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black text-slate-900">音乐</h1>
              <p className="mt-1 text-sm text-[#5b5681]">按歌手进入详情，查看他们的歌曲列表。</p>
            </div>
            <div className={cn(styles.countPill, "px-4 py-2 text-xs")}>收录歌曲 {music.length} 首</div>
          </div>
        </header>

        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <article className={cn(styles.musicDetailShell, "overflow-hidden rounded-[24px] p-5 text-white md:p-6")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/72">
                Spotlight
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/72">Singer first</span>
            </div>

            {spotlightSong ? (
              <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                <Link href={`/music/${spotlightSong.id}`} className="block overflow-hidden rounded-[22px] border border-white/12">
                  <div className="h-[280px] bg-cover bg-center bg-no-repeat" style={coverStyle(spotlightSong, 0)} />
                </Link>

                <div className="flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/54">Featured Track</p>
                    <h2 className="mt-3 text-3xl font-black leading-tight md:text-4xl">{spotlightSong.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-white/72">
                      {spotlightSong.description || "挑一首喜欢的歌，再点进歌手页继续听。"}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white/82">
                      {spotlightSong.album || "单曲"}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white/82">
                      {spotlightSong.genre || "音乐"}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white/82">
                      {spotlightSong.duration || "0:00"}
                    </span>
                  </div>

                  {singerMap.get(spotlightSong.singerId) ? (
                    <Link
                      href={`/music/singers/${spotlightSong.singerId}`}
                      className="mt-5 inline-flex w-fit rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:brightness-95"
                    >
                      去看歌手详情 →
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[22px] border border-white/10 bg-white/6 p-6 text-sm text-white/72">
                暂时还没有音乐内容。
              </div>
            )}
          </article>

          <aside className={cn(styles.musicSurface, "rounded-[24px] p-4 md:p-5")}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">推荐歌手</h2>
                <p className="mt-1 text-xs text-slate-500">点开直接进入歌手歌单</p>
              </div>
              <Link href="#music-grid" className={cn(styles.musicMoreButton, "inline-flex items-center rounded-[18px] px-[16px] py-[9px] text-sm font-bold transition hover:brightness-105")}>
                歌曲列表 →
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {featuredSingers.map((item, index) => (
                <SingerCard key={item.id} item={item} index={index} />
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section id="music-grid" className={cn(styles.musicSurface, "mt-6 rounded-[28px] p-4 md:p-5")}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">歌曲列表</h2>
            <p className="mt-1 text-xs text-slate-500">每一首歌都能顺着歌手页继续听下去</p>
          </div>
          <div className={cn(styles.mutedChip, "px-3 py-1 text-xs")}>按更新时间排序</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {music.map((item, index) => {
            const singer = singerMap.get(item.singerId);
            const singerHref = singer ? `/music/singers/${singer.id}` : "/music";

            return (
              <MusicCard
                key={item.id}
                item={item}
                singerName={singer?.name ?? "未知歌手"}
                singerHref={singerHref}
                index={index}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
