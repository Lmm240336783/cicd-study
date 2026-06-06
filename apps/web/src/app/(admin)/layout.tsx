import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

type AdminLayoutProps = {
  children: ReactNode;
};

/** 为后台路由组注入统一视觉壳布局。 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminShell>{children}</AdminShell>;
}
