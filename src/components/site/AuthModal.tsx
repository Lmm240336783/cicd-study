"use client";

import { useEffect, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { toast } from "@/components/shared";
import { BrandMark } from "@/components/shared/BrandMark";
import { submitAuthRequest, submitForgotPasswordRequest, submitPasswordResetOtpRequest } from "@/lib/auth/client";
import styles from "@/components/site/site-visuals.module.scss";
import { cn } from "@/lib/utils/cn";

export type AuthModalMode = "login" | "register" | "forgot-password";

type AuthModalProps = {
  mode: AuthModalMode;
  onModeChange: (mode: AuthModalMode) => void;
  onAuthenticated: () => void;
  onClose: () => void;
};

/** 渲染邮箱输入图标。 */
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M4.5 7.5h15v10h-15z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m5 8 7 5 7-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 渲染密码输入图标。 */
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <rect x="5.5" y="10" width="13" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8.5 10V7.8a3.5 3.5 0 0 1 7 0V10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** 渲染用户姓名输入图标。 */
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M5.5 19c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** 渲染密码可见性装饰图标。 */
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M3.8 12s3-5 8.2-5 8.2 5 8.2 5-3 5-8.2 5-8.2-5-8.2-5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** 渲染官网登录注册弹框。 */
export function AuthModal({ mode, onModeChange, onAuthenticated, onClose }: AuthModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState("");

  useEffect(() => {
    /** 监听 Escape 按键关闭弹框。 */
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  /** 切换登录注册模式。 */
  function handleModeChange(nextMode: AuthModalMode) {
    setAuthErrorMessage("");
    onModeChange(nextMode);
  }

  /** 发送找回密码验证码。 */
  async function handleSendResetCode(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) {
      return;
    }

    setSubmitting(true);

    try {
      await submitForgotPasswordRequest(new FormData(form));
      toast.success("验证码已发送，请检查邮箱");
    } catch (error) {
      toast.error(error, "验证码发送失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  /** 提交登录、注册或验证码重置密码表单。 */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setAuthErrorMessage("");
    try {
      if (mode === "forgot-password") {
        await submitPasswordResetOtpRequest(new FormData(event.currentTarget));
        toast.success("密码已重置为 123456，请返回登录");
        return;
      }

      await submitAuthRequest(mode, new FormData(event.currentTarget));
      toast.success(mode === "login" ? "登录成功" : "注册成功");
      onAuthenticated();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setAuthErrorMessage(message);
      toast.error(error, "操作失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === "login";
  const isForgotPassword = mode === "forgot-password";
  const title = isLogin ? "欢迎回来" : isForgotPassword ? "找回密码" : "注册新账号";
  const description = isLogin
    ? "登录后继续管理你的收藏"
    : isForgotPassword
      ? "输入邮箱接收验证码，验证后密码将重置为 123456"
      : "创建账号后继续管理你的收藏";

  return (
    <div className={cn(styles.authBackdrop, "fixed inset-0 z-50 flex items-center justify-center px-4 py-6")}>
      <button type="button" className="absolute inset-0 cursor-default" aria-label="关闭登录弹框" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className={cn(styles.authDialog, "relative w-full max-w-[48rem] overflow-hidden rounded-[28px] px-5 py-7 sm:rounded-[36px] sm:px-10 sm:py-10 md:px-12")}
      >
        <span aria-hidden="true" className={styles.authDecorTopLeft} />
        <span aria-hidden="true" className={styles.authDecorTopRight} />
        <span aria-hidden="true" className={styles.authDecorBottomLeft} />
        <span aria-hidden="true" className={styles.authDecorBottomRight} />

        <button
          type="button"
          onClick={onClose}
          className="absolute text-xl right-5 top-5 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#dfc37e] bg-white/80 leading-none text-slate-800 transition hover:bg-[#fff3ca]"
          aria-label="关闭"
        >
          ×
        </button>

        <div className="relative mx-auto flex w-full max-w-[28rem] pt-5 flex-col items-center">
          <BrandMark className="h-24 w-auto" preload />
          <div className="mt-6 text-center">
            <h2 id="auth-modal-title" className="text-3xl font-black text-slate-950">
              {title}
            </h2>
            <p className="mt-3 text-base font-bold text-slate-500">
              {description}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 w-full space-y-5">
            {mode === "register" ? (
              <div className="space-y-2">
                <label htmlFor="auth-name" className="block text-sm font-black text-slate-800">
                  用户姓名
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-950">
                    <UserIcon />
                  </span>
                  <input
                    id="auth-name"
                    name="name"
                    required
                    autoComplete="name"
                    placeholder="请输入用户姓名"
                    className={cn(styles.inputSurface, "h-14 w-full rounded-2xl px-14 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400")}
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="auth-email" className="block text-sm font-black text-slate-800">
                邮箱
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-950">
                  <MailIcon />
                </span>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="请输入邮箱"
                  className={cn(styles.inputSurface, "h-14 w-full rounded-2xl px-14 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400")}
                />
              </div>
            </div>

            {isForgotPassword ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="auth-token" className="block text-sm font-black text-slate-800">
                    验证码
                  </label>
                  <button
                    type="button"
                    onClick={handleSendResetCode}
                    disabled={submitting}
                    className="cursor-pointer text-sm font-black text-[#8c6aff] transition hover:text-[#5f43d9] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    发送验证码
                  </button>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-950">
                    <LockIcon />
                  </span>
                  <input
                    id="auth-token"
                    name="token"
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="请输入邮箱验证码"
                    className={cn(styles.inputSurface, "h-14 w-full rounded-2xl px-14 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400")}
                  />
                </div>
              </div>
            ) : null}

            {!isForgotPassword ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="auth-password" className="block text-sm font-black text-slate-800">
                    密码
                  </label>
                  {isLogin ? (
                    <button
                      type="button"
                      onClick={() => handleModeChange("forgot-password")}
                      className="cursor-pointer text-sm font-black text-[#8c6aff] transition hover:text-[#5f43d9]"
                    >
                      忘记密码？
                    </button>
                  ) : null}
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-950">
                    <LockIcon />
                  </span>
                  <input
                    id="auth-password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder="请输入至少 6 位密码"
                    className={cn(styles.inputSurface, "h-14 w-full rounded-2xl px-14 pr-14 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400")}
                  />
                  <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-500">
                    <EyeIcon />
                  </span>
                </div>
                {isLogin && authErrorMessage === "邮箱或密码错误" ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-slate-500">
                    <span>登录遇到问题？</span>
                    <button
                      type="button"
                      onClick={() => handleModeChange("forgot-password")}
                      className="cursor-pointer font-black text-[#8c6aff] transition hover:text-[#5f43d9]"
                    >
                      忘记密码
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange("register")}
                      className="cursor-pointer font-black text-[#8c6aff] transition hover:text-[#5f43d9]"
                    >
                      去注册
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className={cn(
                styles.violetButton,
                "h-14 w-full cursor-pointer rounded-2xl px-3 text-base font-black text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {submitting ? "提交中..." : isLogin ? "登录" : isForgotPassword ? "验证并重置密码" : "注册"}
            </button>
          </form>

          {isLogin ? (
            <button
              type="button"
              onClick={() => handleModeChange("register")}
              className={cn(styles.authSecondaryButton, "mt-5 h-14 w-full cursor-pointer rounded-2xl px-3 text-base font-black text-slate-950 transition hover:bg-[#fff8e6]")}
            >
              注册新账号
            </button>
          ) : isForgotPassword ? (
            <button
              type="button"
              onClick={() => handleModeChange("login")}
              className={cn(styles.authSecondaryButton, "mt-5 h-14 w-full cursor-pointer rounded-2xl px-3 text-base font-black text-slate-950 transition hover:bg-[#fff8e6]")}
            >
              返回登录
            </button>
          ) : (
            <p className="mt-5 text-center text-sm font-semibold text-slate-500">
              已有账号？
              <button
                type="button"
                onClick={() => handleModeChange("login")}
                className="cursor-pointer font-black text-[#8c6aff] transition hover:text-[#5f43d9]"
              >
                去登录
              </button>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
