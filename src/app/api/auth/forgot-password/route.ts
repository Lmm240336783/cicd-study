import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseForgotPasswordRequestValues } from "@/lib/server/auth/request";
import { sendPasswordResetEmail } from "@/lib/server/auth/supabase";

/** 处理找回密码接口：校验邮箱，然后让 Supabase 给该邮箱发送找回密码邮件。 */
export async function POST(request: NextRequest) {
  const values = await parseForgotPasswordRequestValues(request);
  if (!values) {
    return NextResponse.json({ message: "请输入有效邮箱" }, { status: 400 });
  }

  // 真正的邮件发送逻辑在 `sendPasswordResetEmail()` 里，这里只负责请求解析和响应包装。
  const result = await sendPasswordResetEmail(values);
  if ("message" in result) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  // 发送成功后返回提示文案，前端据此告诉用户去邮箱收验证码。
  return NextResponse.json({ message: "验证码已发送，请检查邮箱" });
}
