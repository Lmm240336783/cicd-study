"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MediaAsset } from "@/components/shared";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import type { ImageAlbumDetailItem } from "@/types";

type ImageAlbumDetailClientProps = {
  id: string;
};

type PublicImageAlbumDetailResponse = {
  data?: ImageAlbumDetailItem;
  message?: string;
};

/** 生成合集当前图片主视觉样式。 */
function albumImageStyle(imageUrl?: string) {
  if (!imageUrl) {
    return {
      backgroundImage: "linear-gradient(135deg, #fff1c7 0%, #ffd36a 48%, #ffb7d2 100%)",
    };
  }

  return {
    backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(38, 20, 5, 0.28)), url("${imageUrl}")`,
  };
}

/** 渲染合集当前主内容。 */
function AlbumStageMedia({ imageUrl, mediaType, title }: { imageUrl: string; mediaType: "image" | "video"; title: string }) {
  if (mediaType === "video") {
    return (
      <>
        <MediaAsset
          key={imageUrl}
          src={imageUrl}
          mediaType={mediaType}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          controls
          playsInline
          preload="metadata"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(38,20,5,0.22)_20%,rgba(38,20,5,0.08)_52%,rgba(38,20,5,0.28)_100%)]" />
      </>
    );
  }

  return <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={albumImageStyle(imageUrl)} />;
}

/** 把公开合集详情接口响应转换成可用数据。 */
async function readAlbumDetailResponse(response: Response) {
  const result = (await response.json().catch(() => null)) as PublicImageAlbumDetailResponse | null;
  if (!response.ok || !result?.data) {
    throw new Error(result?.message || "图片合集详情读取失败");
  }

  return result.data;
}

/** 渲染图片合集详情加载骨架。 */
function ImageAlbumDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.detailShell, "overflow-hidden rounded-[30px] p-3 md:p-5")}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className={cn(styles.detailImageStage, "min-h-[420px] animate-pulse rounded-[26px] bg-[#fff1c7] md:min-h-[620px]")} />
          <aside className={cn(styles.detailInfoPanel, "rounded-[26px] p-5 md:p-7")}>
            <div className="h-10 w-36 animate-pulse rounded-full bg-[#fff5ca]" />
            <div className="mt-8 h-4 w-40 animate-pulse rounded bg-[#ffe7b2]" />
            <div className="mt-4 h-16 w-3/4 animate-pulse rounded bg-[#ffe7b2]" />
            <div className="mt-5 h-28 animate-pulse rounded bg-[#fff1c7]" />
          </aside>
        </div>
      </section>
    </main>
  );
}

/** 渲染图片合集详情错误状态。 */
function ImageAlbumDetailError({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.detailShell, "rounded-[30px] p-8 text-center")}>
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff5eb8]">Image Album</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">合集暂时无法打开</h1>
        <p className="mt-3 text-sm text-slate-600">{message}</p>
        <Link href="/images/albums" className="mt-6 inline-flex rounded-full bg-[#fff5ca] px-4 py-2 text-sm font-black text-[#795c19] transition hover:bg-[#ffe777]">
          返回合集列表
        </Link>
      </section>
    </main>
  );
}

/** 渲染前台图片合集详情客户端壳。 */
export function ImageAlbumDetailClient({ id }: ImageAlbumDetailClientProps) {
  const [album, setAlbum] = useState<ImageAlbumDetailItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const currentImage = useMemo(() => album?.images[currentIndex] ?? null, [album, currentIndex]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAlbum() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/public/image-albums/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        });
        const nextAlbum = await readAlbumDetailResponse(response);
        setAlbum(nextAlbum);
        setCurrentIndex(0);
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        setAlbum(null);
        setError(requestError instanceof Error ? requestError.message : "图片合集详情读取失败");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadAlbum();

    return () => {
      controller.abort();
    };
  }, [id]);

  if (loading) {
    return <ImageAlbumDetailLoading />;
  }

  if (error || !album) {
    return <ImageAlbumDetailError message={error || "图片合集不存在"} />;
  }

  const total = album.images.length;

  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.detailShell, "overflow-hidden rounded-[30px] p-3 md:p-5")}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
            <div
              className={cn(styles.detailImageStage, "relative min-h-[420px] overflow-hidden rounded-[26px] bg-[#fff1c7] md:min-h-[620px]")}
            >
              {currentImage ? <AlbumStageMedia imageUrl={currentImage.imageUrl} mediaType={currentImage.mediaType} title={currentImage.title} /> : null}
              <div className="absolute left-4 top-4 rounded-full bg-white/88 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#7b4edb] shadow-[0_10px_24px_rgba(115,82,219,0.16)] backdrop-blur">
                {total > 0 ? `${currentIndex + 1} / ${total}` : "Empty Album"}
              </div>

              {currentImage ? (
                <div className="absolute right-4 top-4 rounded-full bg-slate-950/72 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur">
                  {currentImage.mediaType === "video" ? "Video" : "Image"}
                </div>
              ) : null}

              {currentImage && currentImage.mediaType === "image" ? (
                <a
                  href={currentImage.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-4 right-4 rounded-full bg-[#fffdf7]/92 px-4 py-2 text-sm font-black text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition hover:bg-white"
                >
                  查看原图 →
                </a>
              ) : null}

              {currentImage && currentImage.mediaType === "video" ? (
                <a
                  href={currentImage.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute right-4 top-16 rounded-full bg-[#fffdf7]/92 px-4 py-2 text-sm font-black text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition hover:bg-white"
                >
                  打开原视频 →
                </a>
              ) : null}
          </div>

          <aside className={cn(styles.detailInfoPanel, "rounded-[26px] p-5 md:p-7")}>
            <div className="flex flex-wrap gap-2">
              <Link href="/images/albums" className="inline-flex rounded-full bg-[#fff5ca] px-4 py-2 text-sm font-black text-[#795c19] transition hover:bg-[#ffe777]">
                ← 返回合集
              </Link>
              <Link href="/images" className="inline-flex rounded-full bg-white/70 px-4 py-2 text-sm font-black text-[#795c19] transition hover:bg-white">
                图片馆
              </Link>
            </div>

            <div className="mt-8">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff5eb8]">Image Album</p>
              <h1 className="mt-3 text-[2.5rem] font-black leading-[1.04] text-slate-950 md:text-[4rem]">{album.title}</h1>
              <p className="mt-5 text-base leading-8 text-slate-700 md:text-lg">{album.description || "这个图片合集正在慢慢补充说明，先按顺序看看里面的图片和视频。"}</p>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={total < 2}
                onClick={() => setCurrentIndex((index) => (index - 1 + total) % total)}
                className="rounded-full bg-[#fff5ca] px-4 py-2 text-sm font-black text-[#795c19] transition hover:bg-[#ffe777] disabled:cursor-not-allowed disabled:opacity-50"
              >
                上一张
              </button>
              <button
                type="button"
                disabled={total < 2}
                onClick={() => setCurrentIndex((index) => (index + 1) % total)}
                className="rounded-full bg-[#ffe777] px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-[#ffd84f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                下一张
              </button>
            </div>

            <div className="mt-7 grid grid-cols-4 gap-2">
              {album.images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "overflow-hidden rounded-xl border bg-white p-1 transition",
                    index === currentIndex ? "border-[#7b4edb] shadow-[0_10px_24px_rgba(123,78,219,0.18)]" : "border-white/70 hover:border-[#ffd84f]",
                  )}
                  title={image.title}
                >
                  <div className="relative">
                    <MediaAsset
                      src={image.imageUrl}
                      mediaType={image.mediaType}
                      alt={image.title}
                      className="h-16 w-full rounded-lg object-cover"
                      autoPlay={image.mediaType === "video"}
                      loop={image.mediaType === "video"}
                      muted={image.mediaType === "video"}
                      playsInline={image.mediaType === "video"}
                      preload={image.mediaType === "video" ? "metadata" : undefined}
                    />
                    {image.mediaType === "video" ? (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-slate-950/72 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                        V
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            {currentImage ? (
              <div className="mt-7 rounded-[20px] bg-white/60 p-4">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">当前内容</p>
                  <span className="rounded-full bg-white/86 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
                    {currentImage.mediaType === "video" ? "视频" : "图片"}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-black text-slate-950">{currentImage.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{currentImage.description || "这项内容还没有单独说明。"}</p>
              </div>
            ) : (
              <div className="mt-7 rounded-[20px] bg-white/60 p-4 text-sm text-slate-600">这个合集还没有添加可公开展示的内容。</div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
