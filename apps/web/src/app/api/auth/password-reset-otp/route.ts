import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parsePasswordResetOtpRequestValues } from "@/lib/server/auth/request";
import { resetPasswordWithRecoveryOtp } from "@/lib/server/auth/supabase";

/** 处理验证码重置密码接口：校验邮箱和验证码，再把目标账号密码重置成默认值。 */
export async function POST(request: NextRequest) {
  const values = await parsePasswordResetOtpRequestValues(request);
  if (!values) {
    return NextResponse.json({ message: "请输入有效邮箱和验证码" }, { status: 400 });
  }

  // 这里会去做 OTP 校验；成功后 Supabase 会把对应账号密码改成默认密码。
  const result = await resetPasswordWithRecoveryOtp(values);
  if ("message" in result) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  // 当前项目的找回密码策略是重置为固定默认值，所以成功后直接把结果文案返回给前端。
  return NextResponse.json({ message: "密码已重置为 123456，请返回登录" });
}
