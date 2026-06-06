import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminUnauthorizedResponse, getSessionFromRequest } from "@/lib/server/auth/cookie";

/** 判断请求是否命中后台页面路由。 */
function isAdminPage(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** 判断请求是否命中后台管理 API。 */
function isAdminApi(pathname: string) {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

/** 在请求进入路由前统一执行后台鉴权。 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = getSessionFromRequest(request);

  if (session) {
    return NextResponse.next();
  }

  if (isAdminApi(pathname)) {
    return createAdminUnauthorizedResponse();
  }

  if (isAdminPage(pathname)) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("auth", "login");
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
