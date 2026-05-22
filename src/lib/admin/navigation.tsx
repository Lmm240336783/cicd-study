import type { ReactNode } from "react";
import { IconLeads, IconOverview, IconReport } from "@/components/admin/icons";

export type AdminMenuRoute = {
  key: string;
  path: string;
  label: string;
  description: string;
};

export type AdminMenuGroup = {
  key: string;
  label: string;
  icon: ReactNode;
  routes: AdminMenuRoute[];
};

export const adminMenuGroups: AdminMenuGroup[] = [
  {
    key: "overview",
    label: "后台总览",
    icon: <IconOverview className="h-4 w-4" />,
    routes: [
      {
        key: "admin-dashboard",
        path: "/admin",
        label: "仪表盘",
        description: "查看图片与电视剧收藏的总览统计和接口状态。",
      },
    ],
  },
  {
    key: "images",
    label: "图片收藏",
    icon: <IconLeads className="h-4 w-4" />,
    routes: [
      {
        key: "admin-images",
        path: "/admin/images",
        label: "图片管理",
        description: "管理图片收藏的新增、编辑、删除、推荐和发布状态。",
      },
    ],
  },
  {
    key: "shows",
    label: "电视剧推荐",
    icon: <IconReport className="h-4 w-4" />,
    routes: [
      {
        key: "admin-shows",
        path: "/admin/shows",
        label: "电视剧管理",
        description: "管理电视剧推荐的新增、编辑、删除、推荐和发布状态。",
      },
    ],
  },
];

/** 基于路径定位当前匹配的后台菜单路由。 */
export function findRouteByPath(pathname: string): AdminMenuRoute | undefined {
  const cleanedPath = pathname === "/" ? "/admin" : pathname;
  const allRoutes = adminMenuGroups.flatMap((group) => group.routes);
  return allRoutes
    .filter((route) => cleanedPath === route.path || cleanedPath.startsWith(`${route.path}/`))
    .sort((current, next) => next.path.length - current.path.length)[0];
}
