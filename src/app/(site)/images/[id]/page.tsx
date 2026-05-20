import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import { getPublicImageById, listFeaturedImages } from "@/lib/server/content/store";
import type { ImageCollectionItem } from "@/types";

type ImageDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

/** 生成图片详情主视觉样式。 */
function detailImageStyle(item: ImageCollectionItem) {
  return {
    backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(38, 20, 5, 0.28)), url("${item.imageUrl}")`,
  };
}

/** 渲染详情页内的推荐小图卡片。 */
function RelatedImageCard({ item }: { item: ImageCollectionItem }) {
  return (
    <Link
      href={`/images/${item.id}`}
      className={cn(styles.detailRelatedCard, "group block overflow-hidden rounded-[18px] bg-[#fff8df] transition")}
    >
      <div
        className={cn(styles.mediaCard, "h-36 bg-cover bg-center bg-no-repeat transition duration-300 group-hover:brightness-105")}
        style={detailImageStyle(item)}
      />
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-black text-slate-900">{item.title}</p>
        <p className="mt-1 line-clamp-1 text-xs font-semibold text-[#8a6b2c]">{item.tags.join(" · ")}</p>
      </div>
    </Link>
  );
}

/** 渲染前台图片收藏详情页。 */
export default async function ImageDetailPage({ params }: ImageDetailPageProps) {
  await connection();

  const { id } = await params;
  const image = await getPublicImageById(id);

  if (!image) {
    notFound();
  }

  const relatedImages = (await listFeaturedImages(4)).filter((item) => item.id !== image.id).slice(0, 4);

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

            {relatedImages.length > 0 ? (
              <section className="mt-8">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-slate-950">继续逛逛</h2>
                  <Link href="/images" className="text-sm font-black text-[#8c54de] transition hover:text-[#6e3fc1]">
                    全部图片 →
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {relatedImages.map((item) => (
                    <RelatedImageCard key={item.id} item={item} />
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
