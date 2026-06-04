"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MediaAsset } from "@/components/shared";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import type { ImageAlbumListItem } from "@/types";

type PublicImageAlbumsResponse = {
  data?: ImageAlbumListItem[];
  message?: string;
};

/** 渲染图片合集列表空状态或错误状态。 */
function ImageAlbumsEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-3 rounded-[26px] bg-[#fff9e8] px-5 py-12 text-center">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff5eb8]">图片合集</p>
      <h2 className="mt-3 text-2xl font-black text-slate-950">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

/** 生成合集封面样式。 */
function albumCoverStyle(album: ImageAlbumListItem, index: number) {
  const fallbackGradients = [
    "linear-gradient(135deg, #ffe6a8 0%, #ffd169 46%, #ffb6d7 100%)",
    "linear-gradient(135deg, #e0f2fe 0%, #93c5fd 48%, #f0abfc 100%)",
    "linear-gradient(135deg, #dcfce7 0%, #86efac 48%, #fde68a 100%)",
  ];

  if (album.coverUrl && album.coverMediaType === "image") {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(20, 18, 4, 0.06), rgba(20, 18, 4, 0.34)), url("${album.coverUrl}")`,
    };
  }

  return {
    backgroundImage: fallbackGradients[index % fallbackGradients.length],
  };
}

/** 把公开合集列表接口响应转换成可用数据。 */
async function readAlbumsResponse(response: Response) {
  const result = (await response.json().catch(() => null)) as PublicImageAlbumsResponse | null;
  if (!response.ok || !result?.data) {
    throw new Error(result?.message || "图片合集读取失败");
  }

  return result.data;
}

/** 渲染图片合集列表客户端壳。 */
export function ImageAlbumsListClient() {
  const [albums, setAlbums] = useState<ImageAlbumListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadAlbums() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch("/api/public/image-albums", {
          signal: controller.signal,
        });
        setAlbums(await readAlbumsResponse(response));
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        setAlbums([]);
        setError(requestError instanceof Error ? requestError.message : "图片合集读取失败");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadAlbums();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.surfacePanel, "overflow-hidden rounded-[30px] p-3 md:p-4")}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <h1 className="text-3xl font-black text-slate-900">图片合集</h1>
            <p className="mt-1 text-sm text-[#705e34]">按主题浏览整理好的图片与短视频内容组。</p>
          </div>
          <Link href="/images" className="rounded-full bg-[#fff5ca] px-4 py-2 text-sm font-black text-[#795c19] transition hover:bg-[#ffe777]">
            返回图片馆
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-72 animate-pulse rounded-[16px] bg-[#fff1c7]" />
            ))}
          </div>
        ) : error ? (
          <ImageAlbumsEmptyState title="合集暂时无法打开" description={error} />
        ) : albums.length === 0 ? (
          <ImageAlbumsEmptyState title="合集正在整理中" description="暂时还没有公开合集，等新合集发布后会出现在这里。" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {albums.map((album, index) => (
              <article key={album.id} className={cn(styles.shelfCard, "group overflow-hidden rounded-[16px] bg-[#fff9e8]")}>
                <Link href={`/images/albums/${album.id}`} className="block cursor-pointer">
                  <div className={cn(styles.mediaCardPlain, "relative h-56 w-full overflow-hidden transition duration-300 group-hover:scale-[1.02]")} style={albumCoverStyle(album, index)}>
                    {album.coverUrl && album.coverMediaType === "video" ? (
                      <>
                        <MediaAsset
                          src={album.coverUrl}
                          mediaType={album.coverMediaType}
                          alt={album.title}
                          className="h-full w-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,18,4,0.12),rgba(20,18,4,0.42))]" />
                        <span className="absolute left-3 top-3 rounded-full bg-slate-950/74 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                          Video
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div className="space-y-2 p-3">
                    <h2 className="font-semibold text-slate-900">{album.title}</h2>
                    <p className="line-clamp-2 text-sm text-slate-600">{album.description || "这个合集还没有添加描述。"}</p>
                    <p className="text-xs leading-5 text-slate-500">共 {album.imageCount} 项内容</p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
