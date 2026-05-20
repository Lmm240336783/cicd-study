import Link from "next/link";
import { connection } from "next/server";
import { listPublicImages } from "@/lib/server/content/store";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";

/** 生成图片封面样式。 */
function imageCoverStyle(imageUrl: string, index: number) {
  const fallbackGradients = [
    "linear-gradient(135deg, #ffe6a8 0%, #ffd169 46%, #ffb6d7 100%)",
    "linear-gradient(135deg, #ffe8ba 0%, #f8c979 46%, #f7d89f 100%)",
    "linear-gradient(135deg, #ffe39a 0%, #ffd975 46%, #ffc59b 100%)",
    "linear-gradient(135deg, #ffecc5 0%, #f9d58d 46%, #f8b7cd 100%)",
  ];

  if (imageUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(20, 18, 4, 0.06), rgba(20, 18, 4, 0.34)), url("${imageUrl}")`,
    };
  }

  return {
    backgroundImage: fallbackGradients[index % fallbackGradients.length],
  };
}

/** 返回图片瀑布流卡片的封面高度。 */
function imageCardHeight(index: number) {
  const heights = [188, 244, 212, 276];
  return heights[index % heights.length];
}

/** 渲染前台图片收藏全量列表页面。 */
export default async function PublicImagesPage() {
  await connection();

  const images = await listPublicImages();

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.surfacePanel, "overflow-hidden rounded-[30px] p-3 md:p-4")}>
        <header className={cn(styles.listHeader, "rounded-[22px] px-5 py-4")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black text-slate-900">图片馆</h1>
              <p className="mt-1 text-sm text-[#705e34]">浏览电影、电视剧和收藏海报</p>
            </div>
            <div className={cn(styles.countPill, "px-4 py-2 text-xs")}>已收录 {images.length} 张图片</div>
          </div>
        </header>

        <div className={cn(styles.controlStrip, "mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[20px] px-4 py-3")}>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={cn(styles.activeChip, "px-3 py-1")}>全部</span>
            <span className={cn(styles.mutedChip, "px-3 py-1")}>电影</span>
            <span className={cn(styles.mutedChip, "px-3 py-1")}>电视剧</span>
            <span className={cn(styles.mutedChip, "px-3 py-1")}>综艺</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span className={cn(styles.mutedChip, "px-3 py-1")}>按评分</span>
            <span className={cn(styles.activeChip, "px-3 py-1 text-slate-900")}>按更新时间</span>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {images.map((item, index) => (
            <article
              key={item.id}
              className={cn(styles.shelfCard, "group overflow-hidden rounded-[16px] bg-[#fff9e8]")}
            >
              <Link href={`/images/${item.id}`} className="block cursor-pointer">
                <div
                  className={cn(styles.mediaCard, "w-full transition duration-300 group-hover:scale-[1.02]")}
                  style={{
                    ...imageCoverStyle(item.imageUrl, index),
                    height: `${imageCardHeight(index)}px`,
                  }}
                />
                <div className="space-y-2 p-3">
                  <h2 className="font-semibold text-slate-900">{item.title}</h2>
                  <p className="line-clamp-2 text-sm text-slate-600">{item.description}</p>
                  <p className="text-xs leading-5 text-slate-500">收藏标签：{item.tags.join(" · ")}</p>
                </div>
              </Link>
              <div className="px-3 pb-3">
                <a href={item.imageUrl} target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-[#9f4ddb] transition hover:text-[#8740be]">
                  查看原图链接
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
