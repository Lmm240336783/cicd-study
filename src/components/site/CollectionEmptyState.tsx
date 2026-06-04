import Link from "next/link";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";

type CollectionEmptyStateProps = {
  eyebrow: string;
  title: string;
  description: string;
};

const emptyStateDecorAssets = {
  cloud: "/exports/yun1.png",
  ribbon: "/exports/xian1.png",
  wave: "/exports/bottomPinkWave.png",
  pinkSpark: "/exports/pinkxx.png",
  blueSpark: "/exports/bluexx.png",
};

/** 渲染前台内容列表为空时的统一展位图。 */
export function CollectionEmptyState({ eyebrow, title, description }: CollectionEmptyStateProps) {
  return (
    <div className={cn(styles.emptyStateShell, "mt-3 grid gap-6 rounded-[26px] px-5 py-6 md:grid-cols-[minmax(0,1fr)_360px] md:px-7 md:py-7")}>
      <div className="flex flex-col justify-center">
        <span className={cn(styles.activeChip, "w-fit px-3 py-1 text-xs text-slate-900")}>{eyebrow}</span>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{title}</h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 md:text-base">{description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className={cn(styles.goldButton, "inline-flex items-center rounded-full px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:brightness-105")}
          >
            先去首页逛逛
          </Link>
          <span className={cn(styles.mutedChip, "px-3 py-1.5 text-xs")}>内容准备好后会自动出现在这里</span>
        </div>
      </div>

      <div className={cn(styles.emptyStateIllustration, "relative min-h-[260px]")}>
        <span
          aria-hidden="true"
          className={cn(styles.emptyStateDecor, styles.emptyStateCloud)}
          style={{ backgroundImage: `url("${emptyStateDecorAssets.cloud}")` }}
        />
        <span
          aria-hidden="true"
          className={cn(styles.emptyStateDecor, styles.emptyStateRibbon)}
          style={{ backgroundImage: `url("${emptyStateDecorAssets.ribbon}")` }}
        />
        <span
          aria-hidden="true"
          className={cn(styles.emptyStateDecor, styles.emptyStateWave)}
          style={{ backgroundImage: `url("${emptyStateDecorAssets.wave}")` }}
        />
        <span
          aria-hidden="true"
          className={cn(styles.emptyStateDecor, styles.emptyStateSparkPink)}
          style={{ backgroundImage: `url("${emptyStateDecorAssets.pinkSpark}")` }}
        />
        <span
          aria-hidden="true"
          className={cn(styles.emptyStateDecor, styles.emptyStateSparkBlue)}
          style={{ backgroundImage: `url("${emptyStateDecorAssets.blueSpark}")` }}
        />
        <span aria-hidden="true" className={styles.emptyStateAura} />

        <div className={styles.emptyStateBooth} aria-hidden="true">
          <span className={styles.emptyStateBoothGlow} />
          <span className={styles.emptyStateBoothCardLeft} />
          <span className={styles.emptyStateBoothCardCenter} />
          <span className={styles.emptyStateBoothCardRight} />
          <span className={styles.emptyStateBoothPodium} />
          <span className={styles.emptyStateBoothShelf} />
        </div>
      </div>
    </div>
  );
}
