import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/server/auth/cookie";

/** 返回当前登录会话接口：前端可以用它判断“我现在是不是已登录”。 */
export async function GET(request: NextRequest) {
  // 会话 token 存在 Cookie 里，所以这里只需要从请求 Cookie 读并校验。
  const session = getSessionFromRequest(request);
  if (!session) {
    // 没登录时不返回 401，而是返回 `{ data: null }`，前端更容易统一处理。
    return NextResponse.json({ data: null });
  }

  // 只返回前端真正需要的会话字段，不把完整 token 细节直接暴露出去。
  return NextResponse.json({
    data: {
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      expiresAt: session.expiresAt,
    },
  });
}
