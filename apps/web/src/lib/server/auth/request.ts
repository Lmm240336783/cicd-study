import { normalizeAuthValues, normalizeForgotPasswordValues, normalizePasswordResetOtpValues } from "@/lib/server/auth/session";
import type {
  AuthMode,
  ForgotPasswordAuthValues,
  LoginAuthValues,
  PasswordResetOtpAuthValues,
  RegisterAuthValues,
} from "@/lib/server/auth/session";

/** 从登录或注册请求里读出参数，并兼容 JSON / form-data / urlencoded 三种提交方式。 */
export async function parseAuthRequestValues(request: Request, mode: "login"): Promise<LoginAuthValues | null>;
export async function parseAuthRequestValues(request: Request, mode: "register"): Promise<RegisterAuthValues | null>;
export async function parseAuthRequestValues(
  request: Request,
  mode: AuthMode,
): Promise<LoginAuthValues | RegisterAuthValues | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    // `request.json()` 会把请求体解析成对象，适合前端用 JSON 提交表单时读取。
    const data = (await request.json().catch(() => null)) as unknown;
    return mode === "login" ? normalizeAuthValues("login", data) : normalizeAuthValues("register", data);
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    // `request.formData()` 会拿到浏览器 FormData，再转成普通对象统一做校验。
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());
    return mode === "login" ? normalizeAuthValues("login", data) : normalizeAuthValues("register", data);
  }

  return null;
}

/** 从“发送找回密码邮件”的请求里读取邮箱字段，并兼容 JSON / 表单提交。 */
export async function parseForgotPasswordRequestValues(request: Request): Promise<ForgotPasswordAuthValues | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    const data = (await request.json().catch(() => null)) as unknown;
    return normalizeForgotPasswordValues(data);
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return normalizeForgotPasswordValues(Object.fromEntries(formData.entries()));
  }

  return null;
}

/** 从“验证码重置密码”的请求里读取邮箱和验证码，并兼容 JSON / 表单提交。 */
export async function parsePasswordResetOtpRequestValues(request: Request): Promise<PasswordResetOtpAuthValues | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    const data = (await request.json().catch(() => null)) as unknown;
    return normalizePasswordResetOtpValues(data);
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return normalizePasswordResetOtpValues(Object.fromEntries(formData.entries()));
  }

  return null;
}
