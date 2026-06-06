import Link from "next/link";
import { connection } from "next/server";
import { CollectionEmptyState } from "@/components/site/CollectionEmptyState";
import { listPublicShows } from "@/lib/server/content/store";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";

/** 生成剧集封面样式。 */
function posterCoverStyle(posterUrl: string, index: number) {
  const fallbackGradients = [
    "linear-gradient(135deg, #ffe7ae 0%, #ffd56f 48%, #ffc58f 100%)",
    "linear-gradient(135deg, #ffe7bd 0%, #f8cf7e 48%, #ffb0cc 100%)",
    "linear-gradient(135deg, #ffe4a3 0%, #ffd36d 48%, #f7cba8 100%)",
    "linear-gradient(135deg, #ffedc9 0%, #f7d388 48%, #f9bcd3 100%)",
  ];

  if (posterUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(20, 18, 4, 0.08), rgba(20, 18, 4, 0.36)), url("${posterUrl}")`,
    };
  }

  return {
    backgroundImage: fallbackGradients[index % fallbackGradients.length],
  };
}

/** 返回剧集瀑布流卡片的封面高度。 */
function showCardHeight(index: number) {
  const heights = [220, 286, 236, 264];
  return heights[index % heights.length];
}

/** 渲染前台电视剧推荐全量列表页面。 */
export default async function PublicShowsPage() {
  await connection();

  const shows = await listPublicShows();
  const isShowsEmpty = shows.length === 0;

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.surfacePanel, "overflow-hidden rounded-[30px] p-3 md:p-4")}>
        {isShowsEmpty ? (
          <CollectionEmptyState
            eyebrow="公开片单"
            title="剧集片单正在布展中"
            description="电视剧展位还在整理中，等公开片单发布后会直接陈列在这个区域。"
          />
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {shows.map((item, index) => (
              <Link
                key={item.id}
                href={`/shows/${item.id}`}
                className={cn(styles.shelfCard, "group block overflow-hidden rounded-[16px] bg-[#fff9e8]")}
              >
                <div
                  className={cn(styles.mediaCardPlain, "w-full transition duration-300 group-hover:scale-[1.02]")}
                  style={{
                    ...posterCoverStyle(item.posterUrl, index),
                    height: `${showCardHeight(index)}px`,
                  }}
                />
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate font-semibold text-slate-900">{item.name}</h2>
                    <span className={cn(styles.activeChip, "px-2.5 py-1 text-[11px] text-slate-900")}>评分 {item.rating}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {item.year} · {item.country} · {item.genres.join(" / ")}
                  </p>
                  <p className="line-clamp-2 text-sm text-slate-600">{item.summary}</p>
                  <p className="line-clamp-2 text-xs font-semibold text-[#8b49cd]">推荐理由：{item.recommendReason}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
