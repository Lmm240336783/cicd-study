import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionToken,
  createUserSession,
  getSessionDisplayName,
  normalizeAuthFailureMessage,
  normalizeAuthValues,
  normalizePasswordResetOtpValues,
  verifySessionToken,
} from "../src/lib/server/auth/session.ts";
import {
  buildAuthPayload,
  buildForgotPasswordPayload,
  buildPasswordResetOtpPayload,
  getAuthEndpoint,
  normalizeAuthErrorMessage,
  submitAuthRequest,
  submitForgotPasswordRequest,
  submitPasswordResetOtpRequest,
} from "../src/lib/auth/client.ts";
import { normalizeForgotPasswordValues } from "../src/lib/server/auth/session.ts";

test("creates a Supabase-backed user session with a display name", () => {
  const session = createUserSession({
    userId: "user-1",
    email: "USER@example.com",
    name: "  Alice  ",
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: Date.now() + 60_000,
  });

  assert.equal(session.userId, "user-1");
  assert.equal(session.email, "user@example.com");
  assert.equal(session.name, "Alice");
  assert.equal(session.role, "admin");
  assert.equal(getSessionDisplayName(session), "Alice");
});

test("falls back to the email name when a user name is missing", () => {
  const session = createUserSession({
    userId: "user-2",
    email: "reader@example.com",
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: Date.now() + 60_000,
  });

  assert.equal(getSessionDisplayName(session), "reader");
});

test("rejects tampered and expired session tokens", () => {
  const session = createUserSession({
    userId: "user-3",
    email: "user3@example.com",
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: Date.now() + 60_000,
  });
  const token = createSessionToken(session);

  assert.deepEqual(verifySessionToken(token), session);
  assert.equal(verifySessionToken(`${token}tampered`), null);

  const expired = createSessionToken({ ...session, expiresAt: Date.now() - 1 });
  assert.equal(verifySessionToken(expired), null);
});

test("normalizes login and register values", () => {
  assert.deepEqual(
    normalizeAuthValues("login", { email: " USER@example.COM ", password: "secret123" }),
    { email: "user@example.com", password: "secret123" },
  );
  assert.deepEqual(
    normalizeAuthValues("register", { email: "new@example.com", password: "secret123", name: " 新用户 " }),
    { email: "new@example.com", password: "secret123", name: "新用户" },
  );
  assert.equal(normalizeAuthValues("register", { email: "new@example.com", password: "secret123" }), null);
});

test("normalizes forgot password values", () => {
  assert.deepEqual(normalizeForgotPasswordValues({ email: " USER@example.COM " }), { email: "user@example.com" });
  assert.equal(normalizeForgotPasswordValues({ email: "invalid-email" }), null);
});

test("normalizes password reset OTP values", () => {
  assert.deepEqual(
    normalizePasswordResetOtpValues({
      email: " USER@example.COM ",
      token: " 1024 ",
    }),
    { email: "user@example.com", token: "1024" },
  );
  assert.equal(normalizePasswordResetOtpValues({ email: "invalid-email", token: "1024" }), null);
  assert.equal(normalizePasswordResetOtpValues({ email: "user@example.com", token: "" }), null);
});

test("builds client auth requests for login and register", () => {
  const formData = new FormData();
  formData.set("name", " 新用户 ");
  formData.set("email", " USER@example.COM ");
  formData.set("password", "secret123");

  assert.equal(getAuthEndpoint("login"), "/api/auth/login");
  assert.equal(getAuthEndpoint("register"), "/api/auth/register");
  assert.equal(getAuthEndpoint("forgot-password"), "/api/auth/forgot-password");
  assert.equal(getAuthEndpoint("password-reset-otp"), "/api/auth/password-reset-otp");
  assert.deepEqual(buildAuthPayload(formData), {
    name: " 新用户 ",
    email: " USER@example.COM ",
    password: "secret123",
  });
  assert.deepEqual(buildForgotPasswordPayload(formData), {
    email: " USER@example.COM ",
  });
  formData.set("token", "1024");
  assert.deepEqual(buildPasswordResetOtpPayload(formData), {
    email: " USER@example.COM ",
    token: "1024",
  });
});

test("normalizes client auth errors", () => {
  assert.equal(normalizeAuthErrorMessage({ message: "邮箱或密码错误" }), "邮箱或密码错误");
  assert.equal(normalizeAuthErrorMessage(null), "操作失败，请稍后重试");
});

test("normalizes password reset user lookup failures without exposing account existence", () => {
  assert.equal(normalizeAuthFailureMessage("User not found"), "邮箱或验证码错误，请确认后重试");
  assert.equal(normalizeAuthFailureMessage("用户不存在"), "邮箱或验证码错误，请确认后重试");
});

test("normalizes Supabase network failures to a readable auth message", () => {
  assert.equal(normalizeAuthFailureMessage("fetch failed"), "认证服务暂时不可用，请稍后重试");
});

test("normalizes Supabase key authorization failures to a configuration message", () => {
  assert.equal(normalizeAuthFailureMessage("Unauthorized"), "Supabase 配置未授权，请检查 URL 和 API Key 是否匹配");
  assert.equal(
    normalizeAuthFailureMessage("Invalid API key"),
    "Supabase 配置未授权，请检查 URL 和 API Key 是否匹配",
  );
});

test("normalizes duplicate registration failures to a duplicate email message", () => {
  assert.equal(normalizeAuthFailureMessage("User already registered"), "该邮箱已被占用，请直接登录");
  assert.equal(normalizeAuthFailureMessage("already registered"), "该邮箱已被占用，请直接登录");
});

test("submits client auth requests to internal auth routes", async () => {
  const formData = new FormData();
  formData.set("email", "user@example.com");
  formData.set("password", "secret123");

  const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  await submitAuthRequest("login", formData, async (input, init) => {
    calls.push({ input, init });
    return new Response(null, { status: 204 });
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.input, "/api/auth/login");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal((calls[0]?.init?.headers as Record<string, string>)["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    name: "",
    email: "user@example.com",
    password: "secret123",
  });
});

test("throws readable client auth errors", async () => {
  const formData = new FormData();
  await assert.rejects(
    () =>
      submitAuthRequest(
        "register",
        formData,
        async () => Response.json({ message: "该邮箱已注册，请直接登录" }, { status: 400 }),
      ),
    /该邮箱已注册，请直接登录/,
  );
});

test("submits forgot password requests to internal auth route", async () => {
  const formData = new FormData();
  formData.set("email", "user@example.com");

  const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  await submitForgotPasswordRequest(formData, async (input, init) => {
    calls.push({ input, init });
    return new Response(null, { status: 204 });
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.input, "/api/auth/forgot-password");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    email: "user@example.com",
  });
});

test("submits password reset OTP requests to internal auth route", async () => {
  const formData = new FormData();
  formData.set("email", "user@example.com");
  formData.set("token", "1024");

  const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  await submitPasswordResetOtpRequest(
    formData,
    async (input, init) => {
      calls.push({ input, init });
      return new Response(null, { status: 204 });
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.input, "/api/auth/password-reset-otp");
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    email: "user@example.com",
    token: "1024",
  });
});
