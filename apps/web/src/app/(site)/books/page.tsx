import Link from "next/link";
import { connection } from "next/server";
import { CollectionEmptyState } from "@/components/site/CollectionEmptyState";
import { listPublicBooks } from "@/lib/server/content/store";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import type { BookCollectionItem } from "@/types";

const bookFallbacks = [
  "linear-gradient(135deg, #fff1b7 0%, #ffd668 48%, #ffc09f 100%)",
  "linear-gradient(135deg, #ffe6c8 0%, #ffd57f 48%, #f7b8d0 100%)",
  "linear-gradient(135deg, #ffe59e 0%, #ffcf63 48%, #f7c48d 100%)",
  "linear-gradient(135deg, #fff0cf 0%, #f9d892 48%, #9be8f7 100%)",
];

/** 生成图书封面背景样式。 */
function bookCoverStyle(item: BookCollectionItem, index: number) {
  if (item.coverUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(20, 18, 4, 0.08), rgba(20, 18, 4, 0.38)), url("${item.coverUrl}")`,
    };
  }

  return {
    backgroundImage: bookFallbacks[index % bookFallbacks.length],
  };
}

/** 渲染前台图书馆藏列表页。 */
export default async function PublicBooksPage() {
  await connection();

  const books = await listPublicBooks();
  const isBooksEmpty = books.length === 0;

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <section className={cn(styles.surfacePanel, "overflow-hidden rounded-[30px] p-3 md:p-4")}>
        {isBooksEmpty ? (
          <CollectionEmptyState
            eyebrow="公开书单"
            title="图书馆藏正在整理中"
            description="馆藏区暂时还没有公开图书，等新书上架后就会第一时间出现在这里。"
          />
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {books.map((item, index) => (
              <Link
                key={item.id}
                href={`/books/detail?id=${item.id}`}
                className={cn(styles.shelfCard, "group block overflow-hidden rounded-[18px] bg-[#fff9e8]")}
              >
                <div
                  className={cn(styles.mediaCardPlain, "h-[280px] bg-cover bg-center bg-no-repeat transition duration-300 group-hover:scale-[1.02]")}
                  style={bookCoverStyle(item, index)}
                />
                <div className="space-y-2 p-4">
                  <span className={cn(styles.activeChip, "px-2.5 py-1 text-[11px] text-slate-900")}>PDF</span>
                  <h2 className="line-clamp-1 text-lg font-black text-slate-900">{item.title}</h2>
                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                    {item.description || "点开查看图书简介，并在详情页直接预览 PDF。"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
