import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/server/auth/cookie";

/** 处理退出登录接口：清掉当前会话 Cookie，并告诉前端退出已经完成。 */
export async function POST() {
  // 先创建一个普通 JSON 响应对象，再在它上面删除会话 Cookie。
  const response = NextResponse.json({ data: { success: true } });
  clearSessionCookie(response);
  return response;
}
