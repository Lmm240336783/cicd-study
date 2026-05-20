import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ShowDetailHero } from "@/components/site/ShowDetailHero";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import { getPublicShowById, listFeaturedShows } from "@/lib/server/content/store";
import type { ShowCollectionItem } from "@/types";

type ShowDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

/** 为详情页底部推荐卡片生成封面背景。 */
function relatedShowCoverStyle(item: ShowCollectionItem) {
  if (item.posterUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(20, 18, 4, 0.06), rgba(20, 18, 4, 0.38)), url("${item.posterUrl}")`,
    };
  }

  return {
    backgroundImage: "linear-gradient(135deg, #1e1b4b 0%, #312e81 48%, #4338ca 100%)",
  };
}

/** 渲染详情页底部推荐剧集卡片。 */
function RelatedShowCard({ item }: { item: ShowCollectionItem }) {
  return (
    <Link
      href={`/shows/${item.id}`}
      className={cn(styles.detailRelatedCard, "group block overflow-hidden rounded-[18px] bg-[#161625] transition")}
    >
      <div
        className={cn(styles.mediaCard, "h-40 bg-cover bg-center bg-no-repeat transition duration-300 group-hover:brightness-105")}
        style={relatedShowCoverStyle(item)}
      />
      <div className="space-y-1.5 p-3">
        <p className="line-clamp-1 text-sm font-black text-white">{item.name}</p>
        <p className="text-xs text-white/60">
          {item.year} · {item.country}
        </p>
      </div>
    </Link>
  );
}

/** 渲染前台电视剧详情页。 */
export default async function ShowDetailPage({ params }: ShowDetailPageProps) {
  await connection();

  const { id } = await params;
  const show = await getPublicShowById(id);

  if (!show) {
    notFound();
  }

  const relatedShows = (await listFeaturedShows(5)).filter((item) => item.id !== show.id).slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <div className="mb-4">
        <Link href="/shows" className="inline-flex rounded-full bg-[#111827] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-[#1f2937] hover:text-white">
          返回电视剧列表
        </Link>
      </div>

      <ShowDetailHero show={show} />

      {relatedShows.length > 0 ? (
        <section className="mt-6 rounded-[28px] bg-[#111318] px-5 py-5 md:px-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">继续看</h2>
              <p className="mt-1 text-sm text-white/56">再挑几部同样值得收藏的剧。</p>
            </div>
            <Link href="/shows" className="text-sm font-semibold text-[#22c55e] transition hover:text-[#4ade80]">
              全部电视剧 →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {relatedShows.map((item) => (
              <RelatedShowCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
