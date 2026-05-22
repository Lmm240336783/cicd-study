"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { adminMenuGroups, findRouteByPath } from "@/lib/admin/navigation";
import { cn } from "@/lib/utils/cn";
import { BrandLogo } from "./BrandLogo";

type AdminShellProps = {
  children: ReactNode;
};

/** 统一规范路径，避免首尾斜杠造成菜单匹配误差。 */
function normalizePathname(pathname: string) {
  if (!pathname) {
    return "/admin";
  }

  const withLeading = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (withLeading.length > 1 && withLeading.endsWith("/")) {
    return withLeading.slice(0, -1);
  }

  return withLeading;
}

/** 生成顶部当前时间文案。 */
function formatCurrentTime(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/** 每分钟刷新一次顶部时钟文案。 */
function useClockText() {
  const [timeText, setTimeText] = useState(() => formatCurrentTime(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeText(formatCurrentTime(new Date()));
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return timeText;
}

/** 渲染后台左侧导航与顶部标题壳。 */
export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();
  const normalizedPathname = normalizePathname(pathname);
  const timeText = useClockText();

  const currentRoute = useMemo(() => findRouteByPath(normalizedPathname), [normalizedPathname]);
  const currentGroup = useMemo(
    () => adminMenuGroups.find((group) => group.routes.some((route) => route.key === currentRoute?.key)),
    [currentRoute],
  );

  /** 返回上一页，若历史不可用则回后台首页。 */
  function handleGoBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/admin");
  }

  /** 退出登录并跳回前台首页。 */
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/?auth=login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="admin-layout-sidebar">
        <div className="border-b border-[#2d4054] px-5 py-4">
          <BrandLogo />
        </div>

        <div className="admin-layout-sidebar-scroll px-0 py-5">
          <div className="space-y-7">
            {adminMenuGroups.map((group) => {
              const isGroupActive = group.key === currentGroup?.key;

              return (
                <section key={group.key} className={cn("base-left-menus", isGroupActive && "active")}>
                  <div className="base-left-menus-title">
                    <span className="base-left-menus-title-icon">{group.icon}</span>
                    <span className="base-left-menus-title-text">{group.label}</span>
                  </div>

                  <div className="base-left-menus-sub">
                    {group.routes.map((route) => {
                      const isActive = currentRoute?.key === route.key;

                      return (
                        <span key={route.key} className="base-left-menus-subrow">
                          <span className={cn("base-left-menus-subitem", isActive && "active")}>
                            <Link href={route.path} className={cn(isActive && "font-semibold", !isActive && "opacity-80")}>
                              {route.label}
                            </Link>
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="flex h-screen flex-1 flex-col overflow-hidden bg-slate-100">
        <header className="h-auto border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-self-end gap-4">
            {/* <div className="flex items-center gap-3">
              <button
                onClick={handleGoBack}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                返回
              </button>
              <h1 className="text-xl font-semibold text-slate-900">{currentRoute?.label ?? "仪表盘"}</h1>
            </div> */}
            <div className="flex items-center gap-3">
              {/* <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Next 单体版本</span> */}
              <span className="text-sm text-slate-500">{timeText}</span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                退出
              </button>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-[1600px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
