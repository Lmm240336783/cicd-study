export type AuthClientMode = "login" | "register" | "forgot-password" | "password-reset-otp";

export type AuthPayload = {
  name: string;
  email: string;
  password: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type PasswordResetOtpPayload = {
  email: string;
  token: string;
};

type AuthFetch = typeof fetch;

/** 根据当前鉴权模式返回站内接口地址。 */
export function getAuthEndpoint(mode: AuthClientMode) {
  if (mode === "login") {
    return "/api/auth/login";
  }

  if (mode === "register") {
    return "/api/auth/register";
  }

  if (mode === "forgot-password") {
    return "/api/auth/forgot-password";
  }

  return "/api/auth/password-reset-otp";
}

/** 从表单数据中组装登录注册请求体。 */
export function buildAuthPayload(formData: FormData): AuthPayload {
  return {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
}

/** 从表单数据中组装找回密码请求体。 */
export function buildForgotPasswordPayload(formData: FormData): ForgotPasswordPayload {
  return {
    email: String(formData.get("email") ?? ""),
  };
}

/** 从表单数据中组装验证码重置密码请求体。 */
export function buildPasswordResetOtpPayload(formData: FormData): PasswordResetOtpPayload {
  return {
    email: String(formData.get("email") ?? ""),
    token: String(formData.get("token") ?? ""),
  };
}

/** 将接口错误响应转换为前端可读文案。 */
export function normalizeAuthErrorMessage(data: unknown) {
  if (typeof data === "object" && data && "message" in data && typeof data.message === "string") {
    return data.message;
  }

  return "操作失败，请稍后重试";
}

/** 提交登录注册请求到站内 Auth 接口。 */
export async function submitAuthRequest(mode: AuthClientMode, formData: FormData, authFetch: AuthFetch = fetch) {
  const response = await authFetch(getAuthEndpoint(mode), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildAuthPayload(formData)),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as unknown;
    throw new Error(normalizeAuthErrorMessage(errorBody));
  }
}

/** 提交找回密码请求到站内 Auth 接口。 */
export async function submitForgotPasswordRequest(formData: FormData, authFetch: AuthFetch = fetch) {
  const response = await authFetch(getAuthEndpoint("forgot-password"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildForgotPasswordPayload(formData)),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as unknown;
    throw new Error(normalizeAuthErrorMessage(errorBody));
  }
}

/** 提交验证码重置密码请求到站内 Auth 接口。 */
export async function submitPasswordResetOtpRequest(
  formData: FormData,
  authFetch: AuthFetch = fetch,
) {
  const response = await authFetch(getAuthEndpoint("password-reset-otp"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildPasswordResetOtpPayload(formData)),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as unknown;
    throw new Error(normalizeAuthErrorMessage(errorBody));
  }
}
