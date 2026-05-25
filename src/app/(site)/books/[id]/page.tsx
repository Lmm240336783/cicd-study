import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getPublicBookById } from "@/lib/server/content/store";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import type { BookCollectionItem } from "@/types";

type PublicBookDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

/** 生成图书详情封面背景样式。 */
function bookCoverStyle(book: BookCollectionItem) {
  if (book.coverUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(38, 20, 5, 0.28)), url("${book.coverUrl}")`,
    };
  }

  return {
    backgroundImage: "linear-gradient(135deg, #fff0bf 0%, #ffd86b 48%, #f7b8cd 100%)",
  };
}

/** 渲染前台图书详情页。 */
export default async function PublicBookDetailPage({ params }: PublicBookDetailPageProps) {
  await connection();

  const { id } = await params;
  const book = await getPublicBookById(id);

  if (!book) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-6 md:px-6 md:pb-16">
      <div className="mb-4">
        <Link href="/books" className="inline-flex rounded-full bg-[#fff5ca] px-4 py-2 text-sm font-black text-[#795c19] transition hover:bg-[#ffe777]">
          返回图书馆藏
        </Link>
      </div>

      <section className={cn(styles.detailShell, "overflow-hidden rounded-[30px] p-3 md:p-5")}>
        <div className="grid gap-5 lg:grid-cols-[minmax(300px,0.72fr)_minmax(0,1fr)]">
          <div
            className={cn(styles.detailImageStage, "relative min-h-[420px] overflow-hidden rounded-[26px] bg-[#fff1c7] bg-cover bg-center bg-no-repeat md:min-h-[560px]")}
            style={bookCoverStyle(book)}
          >
            <div className="absolute left-4 top-4 rounded-full bg-white/88 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#7b4edb] shadow-[0_10px_24px_rgba(115,82,219,0.16)] backdrop-blur">
              Reading Shelf
            </div>
          </div>

          <aside className={cn(styles.detailInfoPanel, "rounded-[26px] p-5 md:p-7")}>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff5eb8]">Public Book Pick</p>
            <h1 className="mt-3 text-[2.5rem] font-black leading-[1.04] text-slate-950 md:text-[4rem]">{book.title}</h1>
            <p className="mt-5 text-base leading-8 text-slate-700 md:text-lg">
              {book.description || "这本书已经放进公开书单，可以直接在当前页面预览 PDF。"}
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              <a
                href={book.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full bg-[#111827] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#1f2937]"
              >
                新窗口打开 PDF
              </a>
              <span className={cn(styles.mutedChip, "px-3 py-2 text-sm")}>站内预览</span>
            </div>

            <dl className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className={cn(styles.detailStatCard, "rounded-[20px] p-4")}>
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">资源类型</dt>
                <dd className="mt-2 text-xl font-black text-slate-950">PDF</dd>
              </div>
              <div className={cn(styles.detailStatCard, "rounded-[20px] p-4")}>
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">更新时间</dt>
                <dd className="mt-2 text-xl font-black text-slate-950">{new Date(book.updatedAt).toLocaleDateString("zh-CN")}</dd>
              </div>
            </dl>
          </aside>
        </div>

        <section className="mt-5">
          <div className={cn(styles.surfacePanel, "rounded-[26px] p-3 md:p-4")}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">在线预览</h2>
                <p className="mt-1 text-sm text-slate-600">如果预览没有显示，请直接使用下方入口在新窗口打开 PDF。</p>
              </div>
              <a
                href={book.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full bg-[#fff5ca] px-4 py-2 text-sm font-black text-[#795c19] transition hover:bg-[#ffe777]"
              >
                新窗口打开 PDF
              </a>
            </div>

            <div className="overflow-hidden rounded-[22px] border border-[#ead59a] bg-white shadow-[0_16px_34px_rgba(201,154,47,0.12)]">
              <iframe
                src={book.pdfUrl}
                title={`${book.title} PDF 预览`}
                className="h-[72vh] min-h-[520px] w-full bg-white"
              />
            </div>

            <p className="mt-3 text-sm text-slate-500">预览依赖当前浏览器的 PDF 能力，若未显示内容可改用新窗口打开。</p>
          </div>
        </section>
      </section>
    </main>
  );
}
