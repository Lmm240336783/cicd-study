import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { setSessionCookie } from "@/lib/server/auth/cookie";
import { parseAuthRequestValues } from "@/lib/server/auth/request";
import { loginWithSupabase } from "@/lib/server/auth/supabase";

/** 处理登录接口：校验参数、调用 Supabase 登录、成功后把站内 session 写进 Cookie。 */
export async function POST(request: NextRequest) {
  const values = await parseAuthRequestValues(request, "login");
  if (!values) {
    return NextResponse.json({ message: "请输入有效邮箱和至少 6 位密码" }, { status: 400 });
  }

  // 这里真正去调 Supabase Auth 登录；失败时会拿到统一整理后的 message/status。
  const result = await loginWithSupabase(values);
  if ("message" in result) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  // `NextResponse.json(...)` 会创建一个响应对象；随后我们再往这个响应上写 Cookie。
  const response = NextResponse.json({
    data: {
      userId: result.session.userId,
      email: result.session.email,
      name: result.session.name,
      role: result.session.role,
      expiresAt: result.session.expiresAt,
    },
  });

  setSessionCookie(response, result.session);
  return response;
}
