import Link from "next/link";
import { connection } from "next/server";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import { listFeaturedImages, listFeaturedShows } from "@/lib/server/content/store";
import type { ImageCollectionItem, ShowCollectionItem } from "@/types";

/** 生成标题下面的辅助文案。 */
function formatMetaTags(tags: string[]) {
  return tags.join(" · ");
}

const pastelFallbacks = [
  "linear-gradient(135deg, #ffe08c 0%, #ffd35b 52%, #ffb5d2 100%)",
  "linear-gradient(135deg, #ffdca4 0%, #ffc97a 52%, #ffd7f0 100%)",
  "linear-gradient(135deg, #f8ca84 0%, #ffd86f 48%, #f7bf98 100%)",
  "linear-gradient(135deg, #ffd977 0%, #ffc86d 52%, #ff9fc8 100%)",
];

/** 生成图片封面样式。 */
function imageCoverStyle(item: ImageCollectionItem, index: number) {
  if (item.imageUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(20, 18, 4, 0.05), rgba(20, 18, 4, 0.34)), url("${item.imageUrl}")`,
    };
  }

  return {
    backgroundImage: pastelFallbacks[index % pastelFallbacks.length],
  };
}

/** 生成电视剧封面样式。 */
function showCoverStyle(item: ShowCollectionItem, index: number) {
  if (item.posterUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(20, 18, 4, 0.05), rgba(20, 18, 4, 0.34)), url("${item.posterUrl}")`,
    };
  }

  return {
    backgroundImage: pastelFallbacks[(index + 1) % pastelFallbacks.length],
  };
}

/** 生成首页主推荐海报样式。 */
function heroPosterStyle(item: ShowCollectionItem, index: number) {
  if (item.posterUrl) {
    return {
      backgroundImage: `url("${item.posterUrl}")`,
    };
  }

  return {
    backgroundImage: pastelFallbacks[(index + 1) % pastelFallbacks.length],
  };
}

/** 渲染顶部主推荐里的海报卡片。 */
function HeroPoster({ item, index }: { item: ShowCollectionItem; index: number }) {
  return (
    <Link
      href={`/shows/${item.id}`}
      className={cn(styles.heroPoster, "group relative block h-[280px] rounded-[18px] bg-[#f6edd1] bg-cover bg-center bg-no-repeat sm:h-[320px] xl:h-full")}
      style={heroPosterStyle(item, index)}
    >
      <div className="absolute inset-0 flex items-end p-3 opacity-0 transition duration-300 group-hover:opacity-100">
        <div className="w-full rounded-[14px] border border-white/25 bg-black/42 p-3 text-white backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">热门电视剧 · {item.year}</p>
          <h3 className="mt-1 text-base font-black leading-tight">{item.name}</h3>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/88">{item.summary || item.recommendReason || "一部适合收藏的热门剧集。"}</p>
        </div>
      </div>
    </Link>
  );
}

/** 渲染底部图片缩略卡片。 */
function MoodCard({ item, index }: { item: ImageCollectionItem; index: number }) {
  return (
    <Link
      href={`/images/${item.id}`}
      className={cn(styles.mediaCard, styles.shelfCard, "group relative block cursor-pointer rounded-[16px] bg-[#f6edd1]")}
      style={imageCoverStyle(item, index)}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#3d2f0b]/64 via-transparent to-transparent transition duration-300 group-hover:from-[#3d2f0b]/78" />
      <div className="flex h-[196px] items-end p-3">
        <div className="w-full rounded-[14px] border border-[#f6e7bc] bg-[#fff9e9]/92 px-3 py-2.5 backdrop-blur">
          <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.title}</p>
          <p className="mt-1 text-[11px] text-slate-600">{formatMetaTags(item.tags)}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{item.description || "一张值得收藏的图片，适合放在展示墙里。"}</p>
        </div>
      </div>
    </Link>
  );
}

/** 渲染底部电视剧缩略卡片。 */
function ShowCard({ item, index }: { item: ShowCollectionItem; index: number }) {
  return (
    <Link
      href={`/shows/${item.id}`}
      className={cn(styles.mediaCard, styles.shelfCard, "group relative block rounded-[16px] bg-[#f6edd1]")}
      style={showCoverStyle(item, index)}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#3d2f0b]/64 via-transparent to-transparent transition duration-300 group-hover:from-[#3d2f0b]/78" />
      <div className="flex h-[196px] items-end p-3">
        <div className="w-full rounded-[14px] border border-[#f6e7bc] bg-[#fff9e9]/92 px-3 py-2.5 backdrop-blur">
          <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.name}</p>
          <p className="mt-1 text-[11px] text-slate-600">
            {item.year} · {item.country} · {item.rating}
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">
            {item.summary || item.recommendReason || "一部适合反复回看的收藏剧集。"}
          </p>
        </div>
      </div>
    </Link>
  );
}

/** 渲染首页。 */
export default async function HomePage() {
  await connection();

  const featuredImages = await listFeaturedImages(4);
  const featuredShows = await listFeaturedShows(5);
  const heroShows = featuredShows.slice(0, 5);
  const overlayHero = heroShows[0];
  const desktopHeroShows = heroShows.slice(1);
  const imageShelf = featuredImages.slice(0, 4);
  const showShelf = featuredShows.slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.heroSurface, "overflow-hidden rounded-[30px] p-3 md:p-4")}>
        <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)] xl:min-h-[360px] xl:grid-cols-[512px_minmax(0,1fr)]">
          <div className="relative xl:min-h-[360px]">
            <article className={cn(styles.promoCard, "relative flex min-h-[280px] flex-col rounded-[22px] p-6 text-slate-900 sm:min-h-[320px] xl:min-h-[360px] xl:pr-[212px]")}>
              <span className="inline-flex rounded-full bg-white/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-800">Hot Collection</span>
              <h1 className="mt-8 text-[2.2rem] font-black leading-tight">
                热门
                <br />
                电视剧
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-800/90">精选你最近最值得收藏与安利的剧，像私人片单的首页封面。</p>
              <Link
                href="/shows"
                className="mt-6 inline-flex w-fit items-center self-start rounded-full bg-gradient-to-r from-[#ff5eb8] to-[#ff9f61] px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(255,94,184,0.34)] transition hover:brightness-105"
              >
                去看看 →
              </Link>
            </article>

            {overlayHero ? (
              <div className="hidden xl:absolute xl:inset-y-4 xl:right-4 xl:block xl:w-[176px]">
                <HeroPoster item={overlayHero} index={0} />
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:hidden">
            {heroShows.map((item, index) => (
              <HeroPoster key={item.id} item={item} index={index} />
            ))}
          </div>

          <div className="hidden gap-3 xl:grid xl:min-h-[360px] xl:grid-cols-4">
            {desktopHeroShows.map((item, index) => (
              <HeroPoster key={item.id} item={item} index={index + 1} />
            ))}
          </div>
        </div>
      </section>

      <section className={cn(styles.lowerPanels, "mt-6 grid gap-5 rounded-[28px] lg:grid-cols-2")}>
        <article className={cn(styles.leftRecommendPanel, "rounded-[24px] p-4 md:p-5")}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className={styles.recommendLeftIcon} />
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">推荐图片</h2>
                <p className="text-xs text-slate-500">每日精选，灵感无限</p>
              </div>
            </div>
            <Link href="/images" className={cn(styles.pinkMoreButton, "inline-flex items-center rounded-[18px] px-[18px] py-[10px] text-sm font-bold transition hover:brightness-105 md:text-base")}>
              更多 →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {imageShelf.map((item, index) => (
              <MoodCard key={item.id} item={item} index={index} />
            ))}
          </div>
        </article>

        <article className={cn(styles.rightRecommendPanel, "rounded-[24px] p-4 md:p-5")}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className={styles.recommendRightIcon} />
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">推荐电视剧</h2>
                <p className="text-xs text-slate-500">发现有趣的视觉瞬间</p>
              </div>
            </div>
            <Link href="/shows" className={cn(styles.yellowMoreButton, "inline-flex items-center rounded-[18px] px-[18px] py-[10px] text-sm font-bold transition hover:brightness-105 md:text-base")}>
              更多 →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {showShelf.map((item, index) => (
              <ShowCard key={item.id} item={item} index={index} />
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
