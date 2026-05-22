import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionToken,
  createUserSession,
  getSessionDisplayName,
  normalizeAuthValues,
  verifySessionToken,
} from "@/lib/server/auth/session";
import type { SessionData } from "@/lib/server/auth/session";

export {
  SESSION_COOKIE_NAME,
  createSessionToken,
  createUserSession,
  getSessionDisplayName,
  normalizeAuthValues,
  verifySessionToken,
};
export type { LoginAuthValues, RegisterAuthValues, SessionData } from "@/lib/server/auth/session";

export const ADMIN_UNAUTHORIZED_MESSAGE = "登录已失效，请重新登录";

/** 把当前登录会话写进响应 Cookie，返回给浏览器后，下次请求就能自动带上。 */
export function setSessionCookie(response: NextResponse, session: SessionData) {
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** 主动清空会话 Cookie，常用于退出登录或登录态失效后的重置。 */
export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/** 统一生成后台接口的 401 响应，避免每个接口重复写同样的未授权文案。 */
export function createAdminUnauthorizedResponse() {
  return NextResponse.json({ message: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 401 });
}

/** 直接从当前请求携带的 Cookie 中取出会话 token，并校验它是否还有效。 */
export function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/** 在 Server Component 或 Route Handler 内部，从 Next 的服务端 Cookie Store 读取会话。 */
export async function getSessionFromCookieStore() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
