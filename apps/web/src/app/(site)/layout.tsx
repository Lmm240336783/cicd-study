import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";
import { getSessionDisplayName, getSessionFromCookieStore } from "@/lib/server/auth/cookie";

type SiteLayoutProps = {
  children: ReactNode;
};

/** 为前台页面注入统一的顶部导航和背景容器。 */
export default async function SiteLayout({ children }: SiteLayoutProps) {
  const session = await getSessionFromCookieStore();
  const headerSession = session
    ? {
        userId: session.userId,
        email: session.email,
        name: getSessionDisplayName(session),
      }
    : null;

  return (
    <div className={cn(styles.siteShell, "relative isolate min-h-screen overflow-hidden")}>
      <div className={styles.topRightSplash} />
      <div className={styles.leftRibbon} />
      <div className={styles.bottomLeftWave} />
      <div className={styles.bottomCenterWave} />
      <div className={styles.bottomRightWave} />
      <div className={styles.siteGrid} />
      <div className="relative z-10">
        <SiteHeader session={headerSession} />
        {children}
      </div>
    </div>
  );
}
