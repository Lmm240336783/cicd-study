import Link from "next/link";
import { connection } from "next/server";
import { CollectionEmptyState } from "@/components/site/CollectionEmptyState";
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
  const isImagesEmpty = images.length === 0;

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.surfacePanel, "overflow-hidden rounded-[30px] p-3 md:p-4")}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <h1 className="text-3xl font-black text-slate-900">图片馆</h1>
            <p className="mt-1 text-sm text-[#705e34]">浏览单张图片，也可以按主题进入合集。</p>
          </div>
          <Link href="/images/albums" className="rounded-full bg-[#fff5ca] px-4 py-2 text-sm font-black text-[#795c19] transition hover:bg-[#ffe777]">
            查看合集
          </Link>
        </div>

        {isImagesEmpty ? (
          <CollectionEmptyState
            eyebrow="公开图片"
            title="图片馆正在布置中"
            description="图片展位暂时还没有公开内容，等新图上墙后就会出现在这里。"
          />
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {images.map((item, index) => (
              <article
                key={item.id}
                className={cn(styles.shelfCard, "group overflow-hidden rounded-[16px] bg-[#fff9e8]")}
              >
                <Link href={`/images/${item.id}`} className="block cursor-pointer">
                  <div
                    className={cn(styles.mediaCardPlain, "w-full transition duration-300 group-hover:scale-[1.02]")}
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
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
