import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildDashboardStats } from "@/components/admin/dashboard-core";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";
import { createContentApiErrorResponse } from "@/lib/server/content/api-error";
import { listAdminImages, listAdminShows } from "@/lib/server/content/store";

/** 校验后台仪表盘请求是否携带有效管理员会话。 */
function ensureAdminSession(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return createAdminUnauthorizedResponse();
  }

  return null;
}

/** 返回后台仪表盘统计数据。 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const [images, shows] = await Promise.all([listAdminImages(), listAdminShows()]);

    return NextResponse.json({
      data: buildDashboardStats(images, shows),
    });
  } catch (error) {
    return createContentApiErrorResponse(error, "读取后台仪表盘失败", "admin/dashboard#get");
  }
}
