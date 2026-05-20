import type { ReactNode } from "react";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
};

/** 渲染后台统一圆角卡片容器。 */
export function SurfaceCard({ children, className = "" }: SurfaceCardProps) {
  return <section className={`rounded-3xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}
