import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { setSessionCookie } from "@/lib/server/auth/cookie";
import { parseAuthRequestValues } from "@/lib/server/auth/request";
import { registerWithSupabase } from "@/lib/server/auth/supabase";

/** 处理注册接口：校验参数、创建 Supabase 用户、成功后立即签发站内 session。 */
export async function POST(request: NextRequest) {
  const values = await parseAuthRequestValues(request, "register");
  if (!values) {
    return NextResponse.json({ message: "请输入姓名、有效邮箱和至少 6 位密码" }, { status: 400 });
  }

  // 这里会先调服务端 Admin API 创建用户，再自动走一次登录拿到 session。
  const result = await registerWithSupabase(values);
  if ("message" in result) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  // 注册成功后把 session 写进 Cookie，前端不用再额外发一次登录请求。
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
