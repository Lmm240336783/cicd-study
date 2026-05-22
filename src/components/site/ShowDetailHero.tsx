"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import type { ShowCollectionItem } from "@/types";

type ShowDetailHeroProps = {
  show: ShowCollectionItem;
};

/** 为详情页整理背景轮播图列表，优先使用轮播图字段，没有时回退到海报。 */
function buildBackdropImages(show: ShowCollectionItem) {
  const images = show.carouselImages.filter(Boolean);
  if (images.length > 0) {
    return images;
  }

  return show.posterUrl ? [show.posterUrl] : [];
}

/** 渲染电视剧详情顶部的背景轮播与主视觉内容。 */
export function ShowDetailHero({ show }: ShowDetailHeroProps) {
  const backdropImages = useMemo(() => buildBackdropImages(show), [show]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "cast">("overview");

  useEffect(() => {
    if (backdropImages.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % backdropImages.length);
    }, 3800);

    return () => {
      window.clearInterval(timer);
    };
  }, [backdropImages]);

  return (
    <section className={cn(styles.showDetailShell, "relative overflow-hidden rounded-[30px] bg-[#212121]")}>
      <div className="absolute inset-0">
        {backdropImages.map((image, index) => (
          <div
            key={`${image}-${index}`}
            className={cn(styles.showBackdropLayer, index === activeIndex ? "opacity-100" : "opacity-0")}
            style={{ backgroundImage: `url("${image}")` }}
          />
        ))}
        <div className={styles.showBackdropShade} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[780px] max-w-[980px] flex-col items-center pb-8 pt-70 text-center text-white md:min-h-[860px]">
        <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black/20 shadow-[0_24px_60px_rgba(0,0,0,0.38)] backdrop-blur-sm">
          {show.posterUrl ? (
            <img
              src={show.posterUrl}
              alt={show.name}
              className="h-[330px] w-[220px] object-cover md:h-[420px] md:w-[280px]"
            />
          ) : (
            <div className="flex h-[330px] w-[220px] items-center justify-center bg-white/10 text-sm font-semibold text-white/70 md:h-[420px] md:w-[280px]">
              暂无海报
            </div>
          )}
        </div>

        <div className="mt-8 w-full max-w-[760px]">
          <h1 className="text-[2.6rem] font-black leading-tight text-white md:text-[3.6rem]">{show.chineseTitle || show.name}</h1>
          <p className="mt-3 text-lg text-white/72 md:text-[1.35rem]">{show.originalTitle || show.name}</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className={styles.showMetaChip}>{show.year}</span>
            {show.genres.map((genre) => (
              <span key={genre} className={styles.showMetaChip}>
                {genre}
              </span>
            ))}
            <span className={styles.showMetaChip}>{show.country}</span>
            <span className={styles.showMetaChip}>评分 {show.rating}</span>
          </div>

          <p className="mx-auto my-6 max-w-[720px] text-sm leading-7 text-white/78 md:text-base">
            {show.summary || "这部剧的简介正在整理中，稍后会补全更完整的内容说明。"}
          </p>

          {/* <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button type="button" className={styles.showActionPrimary}>
              立即播放
            </button>
            <button type="button" className={styles.showActionSecondary}>
              讨论
            </button>
          </div> */}
        </div>

        <div className={cn(styles.showTabsBar, "mt-auto w-full max-w-[920px]")}>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn(styles.showTabButton, activeTab === "overview" && styles.showTabButtonActive)}
            >
              概览
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cast")}
              className={cn(styles.showTabButton, activeTab === "cast" && styles.showTabButtonActive)}
            >
              演员
            </button>
          </div>

          <div className="mt-5 rounded-[22px] bg-black/24 px-5 py-5 text-left text-white/80 backdrop-blur-sm md:px-6">
            {activeTab === "overview" ? (
              <div className="space-y-3">
                <h2 className="text-lg font-black text-white">剧情概览</h2>
                <p className="text-sm leading-7 md:text-base">{show.summary || "暂无概览内容。"}</p>
                <p className="text-sm leading-7 text-white/70 md:text-base">推荐理由：{show.recommendReason || "暂无推荐理由。"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="text-lg font-black text-white">演员</h2>
                <p className="text-sm leading-7 md:text-base">演员信息整理中，后续会补充主要角色与饰演者。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
