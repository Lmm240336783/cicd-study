import Link from "next/link";
import type { CSSProperties } from "react";
import { connection } from "next/server";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import { listFeaturedImages, listFeaturedShows, listFeaturedSingers } from "@/lib/server/content/store";
import type { ImageCollectionItem, ShowCollectionItem, SingerCollectionItem } from "@/types";

/** Build helper text from image tags. */
function formatMetaTags(tags: string[]) {
  return tags.join(" · ");
}

const pastelFallbacks = [
  "linear-gradient(135deg, #ffe08c 0%, #ffd35b 52%, #ffb5d2 100%)",
  "linear-gradient(135deg, #ffdca4 0%, #ffc97a 52%, #ffd7f0 100%)",
  "linear-gradient(135deg, #f8ca84 0%, #ffd86f 48%, #f7bf98 100%)",
  "linear-gradient(135deg, #ffd977 0%, #ffc86d 52%, #ff9fc8 100%)",
];

/** 根据图片地址构造海报卡背景图。 */
function buildPosterBackground(imageUrl: string | undefined, index: number): CSSProperties {
  if (imageUrl) {
    return {
      backgroundImage: `url("${imageUrl}")`,
    };
  }

  return {
    backgroundImage: pastelFallbacks[index % pastelFallbacks.length],
  };
}

/** Build show poster styles. */
function showPosterStyle(item: ShowCollectionItem, index: number) {
  return buildPosterBackground(item.posterUrl, index + 1);
}

/** Build image poster styles. */
function imagePosterStyle(item: ImageCollectionItem, index: number) {
  return buildPosterBackground(item.imageUrl, index);
}

/** Build singer portrait styles. */
function singerPosterStyle(item: SingerCollectionItem, index: number) {
  return buildPosterBackground(item.photoUrl, index);
}

type PosterCardProps = {
  href: string;
  label: string;
  title: string;
  description: string;
  style: CSSProperties;
};

/** Render a shared poster card used by all home recommendation strips. */
function PosterCard({ href, label, title, description, style }: PosterCardProps) {
  return (
    <Link
      href={href}
      className={cn(styles.heroPoster, "group relative block h-[280px] rounded-[18px] bg-[#f6edd1] bg-cover bg-center bg-no-repeat sm:h-[320px] xl:h-full")}
      style={style}
    >
      <div className="absolute inset-0 flex items-end p-3 opacity-0 transition duration-300 group-hover:opacity-100">
        <div className="w-full rounded-[14px] border border-white/25 bg-black/42 p-3 text-white backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">{label}</p>
          <h3 className="mt-1 text-base font-black leading-tight">{title}</h3>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/88">{description}</p>
        </div>
      </div>
    </Link>
  );
}

/** Build the poster card props for a featured show. */
function buildShowPosterCard(item: ShowCollectionItem, index: number): PosterCardProps {
  return {
    href: `/shows/${item.id}`,
    label: `热门电视剧 · ${item.year}`,
    title: item.name,
    description: item.summary || item.recommendReason || "一部适合收藏的热门剧集。",
    style: showPosterStyle(item, index),
  };
}

/** Build the poster card props for a featured image. */
function buildImagePosterCard(item: ImageCollectionItem, index: number): PosterCardProps {
  return {
    href: `/images/${item.id}`,
    label: `推荐图片 · ${index + 1}`,
    title: item.title,
    description: formatMetaTags(item.tags) || item.description || "一张值得收藏的图片，适合放在展示墙里。",
    style: imagePosterStyle(item, index),
  };
}

/** Build the poster card props for a featured singer. */
function buildSingerPosterCard(item: SingerCollectionItem, index: number): PosterCardProps {
  return {
    href: `/music/singers/${item.id}`,
    label: `推荐歌手 · ${index + 1}`,
    title: item.name,
    description: "点进歌手详情看歌单",
    style: singerPosterStyle(item, index),
  };
}

type FeaturedStripSectionProps = {
  eyebrow: string;
  titleLines: string[];
  summary: string;
  ctaHref: string;
  ctaLabel: string;
  cards: PosterCardProps[];
  headingTag?: "h1" | "h2";
  className?: string;
  layout?: "default" | "mirror";
};

/** Render one recommendation strip with the hot-show layout. */
function FeaturedStripSection({
  eyebrow,
  titleLines,
  summary,
  ctaHref,
  ctaLabel,
  cards,
  headingTag = "h2",
  className = "mt-6 overflow-hidden rounded-[30px] p-3 md:p-4",
  layout = "default",
}: FeaturedStripSectionProps) {
  const [leadCard, ...desktopCards] = cards;
  const HeadingTag = headingTag;
  const isMirrorLayout = layout === "mirror";
  const desktopGridTemplateClassName = isMirrorLayout
    ? "lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_512px]"
    : "lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[512px_minmax(0,1fr)]";
  const contentOrderClassName = isMirrorLayout ? "lg:order-2" : undefined;
  const listOrderClassName = isMirrorLayout ? "lg:order-1" : undefined;
  const promoPaddingClassName = isMirrorLayout ? "xl:pl-[212px]" : "xl:pr-[212px]";
  const overlayPositionClassName = isMirrorLayout ? "xl:left-4" : "xl:right-4";

  return (
    <section className={cn(styles.heroSurface, className)}>
      <div className={cn("grid gap-3 xl:min-h-[360px]", desktopGridTemplateClassName)}>
        <div className={cn("relative xl:min-h-[360px]", contentOrderClassName)}>
          <article className={cn(styles.promoCard, "relative flex min-h-[280px] flex-col rounded-[22px] p-6 text-slate-900 sm:min-h-[320px] xl:min-h-[360px]", promoPaddingClassName)}>
            <span className="inline-flex rounded-full bg-white/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-800">{eyebrow}</span>
            <HeadingTag className="mt-8 text-[2.2rem] font-black leading-tight">
              {titleLines[0]}
              <br />
              {titleLines[1]}
            </HeadingTag>
            <p className="mt-4 text-sm leading-7 text-slate-800/90">{summary}</p>
            <Link
              href={ctaHref}
              className="mt-6 inline-flex w-fit items-center self-start rounded-full bg-gradient-to-r from-[#ff5eb8] to-[#ff9f61] px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(255,94,184,0.34)] transition hover:brightness-105"
            >
              {ctaLabel}
            </Link>
          </article>

          {leadCard ? (
            <div className={cn("hidden xl:absolute xl:inset-y-4 xl:block xl:w-[176px]", overlayPositionClassName)}>
              <PosterCard {...leadCard} />
            </div>
          ) : null}
        </div>

        <div className={cn("grid gap-3 sm:grid-cols-2 xl:hidden", listOrderClassName)}>
          {cards.map((card) => (
            <PosterCard key={card.href} {...card} />
          ))}
        </div>

        <div className={cn("hidden gap-3 xl:grid xl:min-h-[360px] xl:grid-cols-4", listOrderClassName)}>
          {desktopCards.map((card) => (
            <PosterCard key={card.href} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Render the home page. */
export default async function HomePage() {
  await connection();

  const [featuredImages, featuredShows, featuredSingers] = await Promise.all([
    listFeaturedImages(5),
    listFeaturedShows(5),
    listFeaturedSingers(5),
  ]);

  const showHeroItems = featuredShows.slice(0, 5);
  const showOverlayHero = showHeroItems[0];
  const desktopShowCards = showHeroItems.slice(1);
  const showPosterCards = [showOverlayHero, ...desktopShowCards].map((item, index) => buildShowPosterCard(item, index));

  const imageHeroItems = featuredImages.slice(0, 5);
  const imageOverlayHero = imageHeroItems[0];
  const desktopImageCards = imageHeroItems.slice(1);
  const imagePosterCards = [imageOverlayHero, ...desktopImageCards].map((item, index) => buildImagePosterCard(item, index));

  const singerHeroItems = featuredSingers.slice(0, 5);
  const singerOverlayHero = singerHeroItems[0];
  const desktopSingerCards = singerHeroItems.slice(1);
  const singerPosterCards = [singerOverlayHero, ...desktopSingerCards].map((item, index) => buildSingerPosterCard(item, index));

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <FeaturedStripSection
        eyebrow="Hot Collection"
        titleLines={["看过", "电视剧"]}
        summary="记录我看过的最值得收藏与安利的剧，像私人片单的首页封面。"
        ctaHref="/shows"
        ctaLabel="去看看 →"
        cards={showPosterCards}
        headingTag="h1"
        className="overflow-hidden rounded-[30px] p-3 md:p-4"
      />

      <FeaturedStripSection
        eyebrow="Daily Picks"
        titleLines={["推荐", "图片"]}
        summary="每日精选，灵感无限，把今天最值得打开的一张图放到你的首页封面位置。"
        ctaHref="/images"
        ctaLabel="更多 →"
        cards={imagePosterCards}
        layout="mirror"
      />

      <FeaturedStripSection
        eyebrow="Daily Voices"
        titleLines={["推荐", "歌手"]}
        summary="挑几位你会想反复点开的歌手，封面和入口保持一样利落。"
        ctaHref="/music"
        ctaLabel="进入音乐 →"
        cards={singerPosterCards}
      />
    </div>
  );
}
