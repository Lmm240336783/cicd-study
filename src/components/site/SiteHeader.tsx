"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/shared/BrandMark";
import { AuthModal } from "@/components/site/AuthModal";
import type { AuthModalMode } from "@/components/site/AuthModal";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";

export type SiteHeaderSession = {
  userId: string;
  email: string;
  name: string;
};

type SiteHeaderProps = {
  session: SiteHeaderSession | null;
};

type SiteMenuItem = {
  href?: string;
  label: string;
};

const siteMenuItems: SiteMenuItem[] = [
  { href: "/", label: "首页" },
  { href: "/images", label: "图片" },
  { href: "/shows", label: "电视剧" },
  { label: "电影" },
  { href: "/music", label: "音乐" },
  { label: "书籍" },
  { label: "关于我" },
];

/** Render the home icon. */
function HomeIcon() {
  return <span aria-hidden="true" className={styles.homeNavIcon} />;
}

/** Render the search icon. */
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Check whether a nav item matches the current path. */
function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Return the active style for top navigation items. */
function getActiveNavClass(href: string) {
  if (href === "/images") {
    return cn(styles.imagesNavActive, "text-slate-950");
  }

  if (href === "/shows") {
    return cn(styles.showsNavActive, "text-slate-950");
  }

  if (href === "/music") {
    return cn(styles.musicNavActive, "text-slate-950");
  }

  return "bg-[#f7d95f] text-slate-950 shadow-[0_10px_22px_rgba(247,217,95,0.44)]";
}

/** Filter a safe internal return path. */
function getSafeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "";
  }

  return value;
}

/** Render the site header. */
export function SiteHeader({ session }: SiteHeaderProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");
  const urlAuthMode: AuthModalMode | null =
    authParam === "login" || authParam === "register" || authParam === "forgot-password" ? authParam : null;
  const returnPath = getSafeReturnPath(searchParams.get("from"));
  const [manualAuthOpen, setManualAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthModalMode>("login");
  const currentAuthMode = urlAuthMode ?? authMode;
  const authOpen = Boolean(urlAuthMode) || manualAuthOpen;

  /** Open the auth modal in a specific mode. */
  function openAuthModal(mode: AuthModalMode) {
    setAuthMode(mode);
    setManualAuthOpen(true);
  }

  /** Close the auth modal and clean up query params. */
  function closeAuthModal() {
    setManualAuthOpen(false);
    if (authParam === "login" || authParam === "register") {
      router.replace(pathname, { scroll: false });
    }
  }

  /** Refresh the session state after login or register. */
  function handleAuthenticated() {
    setManualAuthOpen(false);
    if (returnPath) {
      router.push(returnPath);
      router.refresh();
      return;
    }

    router.replace(pathname, { scroll: false });
    router.refresh();
  }

  /** Sign out and reopen the login modal on the current page. */
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthMode("login");
    setManualAuthOpen(true);
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-40 px-4 pt-4 md:px-6 md:pt-6">
        <div className={cn(styles.navSurface, "mx-auto flex w-full max-w-[90rem] items-center justify-between gap-4 rounded-[28px] px-4 py-3 backdrop-blur md:px-6 lg:px-8")}>
          <Link href="/" className="flex shrink-0 items-center">
            <BrandMark className="h-10 w-auto md:h-12" preload />
          </Link>

          <nav className="flex min-w-0 flex-1 items-center justify-start gap-1 overflow-x-auto px-1 lg:justify-center">
            {siteMenuItems.map((item) => {
              if (!item.href) {
                return (
                  <span
                    key={item.label}
                    className="hidden whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold text-slate-800 md:inline-flex"
                  >
                    {item.label}
                  </span>
                );
              }

              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition md:px-5 md:py-3",
                    active ? getActiveNavClass(item.href) : "text-slate-800 hover:bg-[#fff2c2] hover:text-slate-950",
                  )}
                >
                  {item.href === "/" ? <HomeIcon /> : null}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className={cn(styles.searchButton, "hidden h-11 w-11 items-center justify-center rounded-full text-slate-700 transition hover:border-[#d8c072] hover:bg-[#fffaf0] md:flex")}
              aria-label="搜索收藏"
            >
              <SearchIcon />
            </button>
            {session ? (
              <>
                <Link
                  href="/admin"
                  className={cn(styles.violetButton, "rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105")}
                >
                  前往后台
                </Link>
                <div className="group relative">
                  <button
                    type="button"
                    className="rounded-full border border-[#ead59a] bg-white/90 px-4 py-2.5 text-sm font-black text-slate-800 transition hover:bg-[#fff3ca]"
                  >
                    {session.name}
                  </button>
                  <div className={cn(styles.userMenuPanel, "invisible absolute right-0 top-full mt-2 w-36 rounded-2xl p-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100")}>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-[#fff3ca]"
                    >
                      退出登录
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className={cn(styles.violetButton, "rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-105")}
              >
                登录 / 注册
              </button>
            )}
          </div>
        </div>
      </header>

      {authOpen ? (
        <AuthModal
          mode={currentAuthMode}
          onModeChange={setAuthMode}
          onAuthenticated={handleAuthenticated}
          onClose={closeAuthModal}
        />
      ) : null}
    </>
  );
}
