"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import type { ImageCollectionItem } from "@/types";

type ImageDetailClientProps = {
  id: string;
};

type PublicImageDetailResponse = {
  data?: ImageCollectionItem;
  message?: string;
};

/** 生成图片详情主视觉样式。 */
function detailImageStyle(item?: ImageCollectionItem | null) {
  if (!item?.imageUrl) {
    return {
      backgroundImage: "linear-gradient(135deg, #fff1c7 0%, #ffd36a 48%, #ffb7d2 100%)",
    };
  }

  return {
    backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(38, 20, 5, 0.28)), url("${item.imageUrl}")`,
  };
}

/** 把接口响应转换成可读错误。 */
async function readImageDetailResponse(response: Response) {
  const result = (await response.json().catch(() => null)) as PublicImageDetailResponse | null;
  if (!response.ok || !result?.data) {
    throw new Error(result?.message || "图片详情读取失败");
  }

  return result.data;
}

/** 渲染图片详情加载中的页面骨架。 */
function ImageDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.detailShell, "overflow-hidden rounded-[30px] p-3 md:p-5")}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className={cn(styles.detailImageStage, "min-h-[420px] animate-pulse rounded-[26px] bg-[#fff1c7] md:min-h-[620px]")} />
          <aside className={cn(styles.detailInfoPanel, "rounded-[26px] p-5 md:p-7")}>
            <div className="h-10 w-32 animate-pulse rounded-full bg-[#fff5ca]" />
            <div className="mt-8 h-4 w-44 animate-pulse rounded bg-[#ffe7b2]" />
            <div className="mt-4 h-16 w-3/4 animate-pulse rounded bg-[#ffe7b2]" />
            <div className="mt-5 h-28 animate-pulse rounded bg-[#fff1c7]" />
          </aside>
        </div>
      </section>
    </main>
  );
}

/** 渲染图片详情错误状态。 */
function ImageDetailError({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.detailShell, "rounded-[30px] p-8 text-center")}>
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff5eb8]">Image Detail</p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">图片暂时无法打开</h1>
        <p className="mt-3 text-sm text-slate-600">{message}</p>
        <Link href="/images" className="mt-6 inline-flex rounded-full bg-[#fff5ca] px-4 py-2 text-sm font-black text-[#795c19] transition hover:bg-[#ffe777]">
          返回图片馆
        </Link>
      </section>
    </main>
  );
}

/** 渲染前台图片收藏详情客户端壳。 */
export function ImageDetailClient({ id }: ImageDetailClientProps) {
  const [image, setImage] = useState<ImageCollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadImage() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/public/images/${encodeURIComponent(id)}`, {
          signal: controller.signal,
        });
        setImage(await readImageDetailResponse(response));
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        setImage(null);
        setError(requestError instanceof Error ? requestError.message : "图片详情读取失败");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadImage();

    return () => {
      controller.abort();
    };
  }, [id]);

  if (loading) {
    return <ImageDetailLoading />;
  }

  if (error || !image) {
    return <ImageDetailError message={error || "图片不存在"} />;
  }

  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.detailShell, "overflow-hidden rounded-[30px] p-3 md:p-5")}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className={cn(styles.detailImageStage, "relative min-h-[420px] overflow-hidden rounded-[26px] bg-[#fff1c7] bg-cover bg-center bg-no-repeat md:min-h-[620px]")} style={detailImageStyle(image)}>
            <div className="absolute left-4 top-4 rounded-full bg-white/88 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#7b4edb] shadow-[0_10px_24px_rgba(115,82,219,0.16)] backdrop-blur">
              Featured Image
            </div>
            <a
              href={image.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-4 right-4 rounded-full bg-[#fffdf7]/92 px-4 py-2 text-sm font-black text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition hover:bg-white"
            >
              查看原图 →
            </a>
          </div>

          <aside className={cn(styles.detailInfoPanel, "rounded-[26px] p-5 md:p-7")}>
            <Link href="/images" className="inline-flex rounded-full bg-[#fff5ca] px-4 py-2 text-sm font-black text-[#795c19] transition hover:bg-[#ffe777]">
              ← 返回图片馆
            </Link>

            <div className="mt-8">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff5eb8]">My Collection Pick</p>
              <h1 className="mt-3 text-[2.5rem] font-black leading-[1.04] text-slate-950 md:text-[4rem]">{image.title}</h1>
              <p className="mt-5 text-base leading-8 text-slate-700 md:text-lg">{image.description || "这张图片被收进了你的灵感收藏夹，适合在需要一点颜色和情绪的时候打开看看。"}</p>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              {image.tags.map((tag) => (
                <span key={tag} className={cn(styles.detailTag, "rounded-full px-4 py-2 text-sm font-black")}>
                  #{tag}
                </span>
              ))}
            </div>

            <dl className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className={cn(styles.detailStatCard, "rounded-[20px] p-4")}>
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">状态</dt>
                <dd className="mt-2 text-xl font-black text-slate-950">{image.isFeatured ? "首页推荐" : "普通收藏"}</dd>
              </div>
              <div className={cn(styles.detailStatCard, "rounded-[20px] p-4")}>
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">更新时间</dt>
                <dd className="mt-2 text-xl font-black text-slate-950">{new Date(image.updatedAt).toLocaleDateString("zh-CN")}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </main>
  );
}
