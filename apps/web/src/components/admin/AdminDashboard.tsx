"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminDashboardStats } from "@/components/admin/dashboard-core";
import { toast } from "@/components/shared";

type DashboardResponse = {
  data?: AdminDashboardStats;
  message?: string;
};

const emptyStats: AdminDashboardStats = {
  imagesCount: 0,
  showsCount: 0,
  featuredImagesCount: 0,
  featuredShowsCount: 0,
};

/** 读取后台仪表盘统计接口。 */
async function fetchDashboardStats() {
  const response = await fetch("/api/admin/dashboard", {
    credentials: "same-origin",
  });
  const result = (await response.json()) as DashboardResponse;

  if (!response.ok || !result.data) {
    throw new Error(result.message || "仪表盘数据读取失败");
  }

  return result.data;
}

/** 渲染单个仪表盘统计卡片。 */
function StatCard({ label, loading, tone, value }: { label: string; loading: boolean; tone?: string; value: number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${tone ?? "text-slate-900"}`}>{loading ? "..." : value}</p>
    </article>
  );
}

/** 渲染后台仪表盘并在客户端请求真实统计接口。 */
export function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchDashboardStats()
      .then((nextStats) => {
        if (active) {
          setStats(nextStats);
        }
      })
      .catch((error) => {
        if (active) {
          toast.error(error, "仪表盘数据读取失败");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">内容概览</h2>
            <p className="mt-1 text-sm text-slate-500">这里展示 Supabase 内容库中的图片和电视剧数据概览。</p>
          </div>
          <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
            返回前台
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="图片总数" loading={loading} value={stats.imagesCount} />
        <StatCard label="电视剧总数" loading={loading} value={stats.showsCount} />
        <StatCard label="精选图片" loading={loading} tone="text-blue-700" value={stats.featuredImagesCount} />
        <StatCard label="精选电视剧" loading={loading} tone="text-blue-700" value={stats.featuredShowsCount} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">图片管理接口</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>GET /api/admin/images</li>
            <li>POST /api/admin/images</li>
            <li>PATCH /api/admin/images/:id</li>
            <li>DELETE /api/admin/images/:id</li>
          </ul>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">电视剧管理接口</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>GET /api/admin/shows</li>
            <li>POST /api/admin/shows</li>
            <li>PATCH /api/admin/shows/:id</li>
            <li>DELETE /api/admin/shows/:id</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
