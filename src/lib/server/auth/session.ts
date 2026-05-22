import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "pc_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type SessionData = {
  userId: string;
  email: string;
  name: string;
  role: "admin";
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type AuthMode = "login" | "register";

export type LoginAuthValues = {
  email: string;
  password: string;
};

export type RegisterAuthValues = LoginAuthValues & {
  name: string;
};

export type ForgotPasswordAuthValues = {
  email: string;
};

export type PasswordResetOtpAuthValues = {
  email: string;
  token: string;
};

export const PASSWORD_RESET_OTP_FAILURE_MESSAGE = "邮箱或验证码错误，请确认后重试";
export const SUPABASE_CONFIGURATION_FAILURE_MESSAGE = "Supabase 配置未授权，请检查 URL 和 API Key 是否匹配";

type UserSessionInput = {
  userId: string;
  email: string;
  name?: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

type UnknownRecord = Record<string, unknown>;

/** 读取会话签名密钥。 */
function getAuthSecret() {
  return process.env.AUTH_SECRET ?? "dev-only-secret-change-me";
}

/** 将文本编码为 URL 安全的 Base64。 */
function encodeBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

/** 将 URL 安全的 Base64 解码为文本。 */
function decodeBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

/** 对会话负载进行 HMAC 签名。 */
function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

/** 使用固定时长比较避免签名时序攻击。 */
function isEqualSignature(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

/** 判断未知值是否为普通对象。 */
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

/** 读取对象中的字符串字段。 */
function readString(data: UnknownRecord, key: string) {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

/** 将鉴权错误转换为前端可读且不暴露账号存在性的文案。 */
export function normalizeAuthFailureMessage(message: string) {
  const trimmedMessage = message.trim();
  const lowerMessage = trimmedMessage.toLowerCase();

  if (lowerMessage.includes("user not found") || trimmedMessage.includes("用户不存在")) {
    return PASSWORD_RESET_OTP_FAILURE_MESSAGE;
  }

  if (lowerMessage.includes("fetch failed") || lowerMessage.includes("network")) {
    return "认证服务暂时不可用，请稍后重试";
  }

  if (
    lowerMessage === "unauthorized" ||
    lowerMessage.includes("invalid api key") ||
    lowerMessage.includes("api key") ||
    lowerMessage.includes("jwt")
  ) {
    return SUPABASE_CONFIGURATION_FAILURE_MESSAGE;
  }

  if (lowerMessage.includes("invalid login credentials")) {
    return "邮箱或密码错误";
  }

  if (lowerMessage.includes("already") || lowerMessage.includes("registered")) {
    return "该邮箱已被占用，请直接登录";
  }

  if (lowerMessage.includes("password")) {
    return "密码不符合要求，请至少输入 6 位";
  }

  return trimmedMessage || "鉴权失败，请稍后重试";
}

/** 返回用户在界面中展示的名称。 */
export function getSessionDisplayName(session: Pick<SessionData, "email" | "name">) {
  const normalizedName = session.name.trim();
  if (normalizedName) {
    return normalizedName;
  }

  return session.email.split("@")[0] || session.email;
}

/** 创建 Supabase 登录成功后的站内会话对象。 */
export function createUserSession(input: UserSessionInput): SessionData {
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || email.split("@")[0] || email;

  return {
    userId: input.userId,
    email,
    name,
    role: "admin",
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    expiresAt: input.expiresAt,
  };
}

/** 创建可放入 Cookie 的会话令牌。 */
export function createSessionToken(data: SessionData) {
  const payloadRaw = JSON.stringify(data);
  const payload = encodeBase64Url(payloadRaw);
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

/** 校验会话令牌并解析会话数据。 */
export function verifySessionToken(token: string | null | undefined): SessionData | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload);
  if (!isEqualSignature(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as SessionData;
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
      return null;
    }

    if (
      parsed.role !== "admin" ||
      !parsed.userId ||
      !parsed.email ||
      !parsed.accessToken ||
      !parsed.refreshToken
    ) {
      return null;
    }

    return createUserSession(parsed);
  } catch {
    return null;
  }
}

/** 规范化登录或注册请求值。 */
export function normalizeAuthValues(mode: "login", data: unknown): LoginAuthValues | null;
export function normalizeAuthValues(mode: "register", data: unknown): RegisterAuthValues | null;
export function normalizeAuthValues(mode: AuthMode, data: unknown): LoginAuthValues | RegisterAuthValues | null {
  if (!isRecord(data)) {
    return null;
  }

  const email = readString(data, "email").trim().toLowerCase();
  const password = readString(data, "password");

  if (!email || !email.includes("@") || password.length < 6) {
    return null;
  }

  if (mode === "login") {
    return { email, password };
  }

  const name = readString(data, "name").trim();
  if (!name) {
    return null;
  }

  return { email, password, name };
}

/** 规范化找回密码请求值。 */
export function normalizeForgotPasswordValues(data: unknown): ForgotPasswordAuthValues | null {
  if (!isRecord(data)) {
    return null;
  }

  const email = readString(data, "email").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return null;
  }

  return { email };
}

/** 规范化验证码重置密码请求值。 */
export function normalizePasswordResetOtpValues(data: unknown): PasswordResetOtpAuthValues | null {
  if (!isRecord(data)) {
    return null;
  }

  const email = readString(data, "email").trim().toLowerCase();
  const token = readString(data, "token").trim();

  if (!email || !email.includes("@") || !token) {
    return null;
  }

  return { email, token };
}
