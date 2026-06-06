import "server-only";
import type { Session, User } from "@supabase/supabase-js";
import { createUserSession, normalizeAuthFailureMessage } from "@/lib/server/auth/session";
import type {
  ForgotPasswordAuthValues,
  LoginAuthValues,
  PasswordResetOtpAuthValues,
  RegisterAuthValues,
  SessionData,
} from "@/lib/server/auth/session";
import { createSupabaseAdminClient } from "@/lib/server/supabase/admin";
import { createSupabasePublicClient } from "@/lib/server/supabase/public";

type AuthResult =
  | {
      session: SessionData;
    }
  | {
      message: string;
      status: number;
    };

type PasswordResetResult = { ok: true } | { message: string; status: number };

const DEFAULT_RESET_PASSWORD = "123456";
const DEV_PASSWORD_RESET_OTP = "1024";
const AUTH_SERVICE_UNAVAILABLE_MESSAGE = "认证服务暂时不可用，请稍后重试";

type SupabaseAuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

/** 根据鉴权错误文案判断是否为认证服务连接异常。 */
function getAuthFailureStatus(message: string, fallbackStatus: number) {
  return message === AUTH_SERVICE_UNAVAILABLE_MESSAGE ? 503 : fallbackStatus;
}

/** 记录服务端鉴权失败细节，便于排查真实错误原因。 */
function logSupabaseAuthFailure(context: string, error: SupabaseAuthErrorLike | null | undefined) {
  console.error(`[auth] ${context} failed`, {
    code: error?.code ?? "",
    status: error?.status ?? null,
    message: error?.message ?? "",
  });
}

/** 基于 Supabase Auth 错误对象优先判断错误码，再回退到消息文案。 */
function normalizeSupabaseAuthError(error: SupabaseAuthErrorLike | null | undefined) {
  const code = error?.code?.toLowerCase() ?? "";

  if (code === "invalid_credentials") {
    return "邮箱或密码错误";
  }

  if (code === "user_not_found") {
    return "邮箱或密码错误";
  }

  return normalizeAuthFailureMessage(error?.message ?? "");
}

/** 从 Supabase 用户元数据中读取展示名。 */
function getUserDisplayName(user: User, fallbackName?: string) {
  const metadata = user.user_metadata;
  const metadataName = typeof metadata.name === "string" ? metadata.name : "";
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name : "";
  return metadataName || fullName || fallbackName || user.email || "";
}

/** 将 Supabase 会话转换为站内会话。 */
function createSessionFromSupabase(session: Session, fallbackName?: string) {
  const user = session.user;
  const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + session.expires_in * 1000;

  return createUserSession({
    userId: user.id,
    email: user.email ?? "",
    name: getUserDisplayName(user, fallbackName),
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt,
  });
}

/** 使用 Supabase Auth 发送密码重置邮件。 */
export async function sendPasswordResetEmail(
  values: ForgotPasswordAuthValues,
  redirectTo?: string,
): Promise<{ ok: true } | { message: string; status: number }> {
  const supabase = createSupabasePublicClient();
  // `supabase.auth.resetPasswordForEmail(email, options)`:
  // 1. 按邮箱触发 Supabase 官方找回密码流程
  // 2. `redirectTo` 是用户点开邮件后跳回来的前端地址
  // 3. 返回结构里我们这里只关心 `error`，成功时不需要额外数据
  const { error } = await supabase.auth.resetPasswordForEmail(values.email, redirectTo ? { redirectTo } : undefined);

  if (error) {
    logSupabaseAuthFailure("forgot-password", error);
    return {
      message: normalizeAuthFailureMessage(error.message),
      status: 400,
    };
  }

  return { ok: true };
}

/** 判断是否允许使用开发模式固定验证码。 */
function canUseDevPasswordResetOtp(token: string) {
  return process.env.NODE_ENV !== "production" && token === DEV_PASSWORD_RESET_OTP;
}

/** 使用 Supabase Admin 按邮箱查找用户。 */
async function findSupabaseUserByEmail(email: string) {
  const adminClient = createSupabaseAdminClient();
  // `admin.listUsers({ page, perPage })`:
  // 1. 这是管理员接口，依赖 `SUPABASE_SECRET_KEY`
  // 2. 会返回一个分页后的用户列表 `data.users`
  // 3. 这里先取一页大列表，再在服务端按邮箱做精确匹配
  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    return { error, user: null };
  }

  const normalizedEmail = email.toLowerCase();
  const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail) ?? null;

  return { error: null, user };
}

/** 开发模式下使用固定验证码将指定邮箱密码重置为默认值。 */
async function resetPasswordWithDevOtp(values: PasswordResetOtpAuthValues): Promise<PasswordResetResult> {
  const adminClient = createSupabaseAdminClient();
  const { error: findError, user } = await findSupabaseUserByEmail(values.email);
  if (findError) {
    logSupabaseAuthFailure("password-reset-find-user", findError);
    return {
      message: normalizeAuthFailureMessage(findError.message),
      status: 400,
    };
  }

  if (!user) {
    return {
      message: normalizeAuthFailureMessage("用户不存在"),
      status: 404,
    };
  }

  // `admin.updateUserById(userId, attributes)`:
  // 1. 按已知用户 id 更新账号资料
  // 2. 这里只传 `{ password }`，表示把匹配到的账号密码重置为默认值
  // 3. 因为是 Admin API，所以不需要用户当前登录态，只需要服务端管理员密钥
  const { error } = await adminClient.auth.admin.updateUserById(user.id, {
    password: DEFAULT_RESET_PASSWORD,
  });

  if (error) {
    logSupabaseAuthFailure("password-reset-dev-otp", error);
    return {
      message: normalizeAuthFailureMessage(error.message),
      status: 400,
    };
  }

  return { ok: true };
}

/** 使用 Supabase Recovery OTP 将密码重置为默认值。 */
export async function resetPasswordWithRecoveryOtp(values: PasswordResetOtpAuthValues): Promise<PasswordResetResult> {
  if (canUseDevPasswordResetOtp(values.token)) {
    return resetPasswordWithDevOtp(values);
  }

  const supabase = createSupabasePublicClient();
  // `supabase.auth.verifyOtp(...)`:
  // 1. 校验用户从邮件里拿到的验证码是否有效
  // 2. `type: "recovery"` 表示这是找回密码场景，不是注册确认或 magic link
  // 3. 校验成功后，Supabase 会返回一个临时 `session`，接下来才能调用 `updateUser`
  const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
    email: values.email,
    token: values.token,
    type: "recovery",
  });

  if (sessionError || !sessionData.session) {
    logSupabaseAuthFailure("password-reset-verify-otp", sessionError);
    return {
      message: normalizeAuthFailureMessage(sessionError?.message ?? "密码重置链接无效或已过期"),
      status: 400,
    };
  }

  // `supabase.auth.updateUser({ password })`:
  // 1. 更新“当前这个已登录用户”的账号资料
  // 2. 因为上一步 `verifyOtp` 已经把 recovery 用户切成当前 session，
  //    所以这里会把验证码匹配到的那个账号密码改掉
  // 3. 传 `{ password: DEFAULT_RESET_PASSWORD }` 就是把该账号重置为默认密码
  const { error: updateError } = await supabase.auth.updateUser({
    password: DEFAULT_RESET_PASSWORD,
  });

  if (updateError) {
    logSupabaseAuthFailure("password-reset-update-user", updateError);
    return {
      message: normalizeAuthFailureMessage(updateError.message),
      status: 400,
    };
  }

  return { ok: true };
}

/** 使用 Supabase Auth 登录并返回站内会话。 */
export async function loginWithSupabase(values: LoginAuthValues): Promise<AuthResult> {
  const supabase = createSupabasePublicClient();
  let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["data"];
  let error: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["error"];

  try {
    // `supabase.auth.signInWithPassword({ email, password })`:
    // 1. 用邮箱密码发起标准登录
    // 2. 成功时 `result.data.session` 里会带 access token / refresh token / user
    // 3. 失败时通常不会 throw，而是把原因放进 `result.error`
    const result = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    data = result.data;
    error = result.error;
  } catch (reason) {
    console.error("[auth] login request failed", {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
    const message = normalizeAuthFailureMessage(reason instanceof Error ? reason.message : String(reason));
    return {
      message,
      status: getAuthFailureStatus(message, 401),
    };
  }

  if (error || !data.session) {
    logSupabaseAuthFailure("login", error);
    const message = normalizeSupabaseAuthError(error);
    return {
      message,
      status: getAuthFailureStatus(message, 401),
    };
  }

  return {
    session: createSessionFromSupabase(data.session),
  };
}

/** 使用 Supabase Auth 注册用户并自动建立登录会话。 */
export async function registerWithSupabase(values: RegisterAuthValues): Promise<AuthResult> {
  const adminClient = createSupabaseAdminClient();
  // `admin.createUser(attributes)`:
  // 1. 由服务端直接创建 Supabase Auth 用户
  // 2. `email_confirm: true` 表示跳过“邮箱待确认”状态，创建后可直接登录
  // 3. `user_metadata` 是自定义资料，会挂到 `user.user_metadata` 上
  const { error: createError } = await adminClient.auth.admin.createUser({
    email: values.email,
    password: values.password,
    email_confirm: true,
    user_metadata: {
      name: values.name,
    },
  });

  if (createError) {
    logSupabaseAuthFailure("register", createError);
    return {
      message: normalizeAuthFailureMessage(createError.message),
      status: 400,
    };
  }

  const loginResult = await loginWithSupabase(values);
  if ("message" in loginResult) {
    return loginResult;
  }

  return {
    session: createUserSession({
      ...loginResult.session,
      name: values.name,
    }),
  };
}
