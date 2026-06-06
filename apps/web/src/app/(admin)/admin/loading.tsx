/** 渲染后台首页加载骨架。 */
export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="h-5 w-32 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-72 max-w-full rounded bg-slate-100" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {["图片总数", "电视剧总数", "精选图片", "精选电视剧"].map((label) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <div className="mt-3 h-9 w-16 rounded bg-slate-100" />
          </article>
        ))}
      </section>
    </div>
  );
}
