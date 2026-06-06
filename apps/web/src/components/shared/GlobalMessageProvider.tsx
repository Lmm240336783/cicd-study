"use client";

import { useEffect, type ReactNode } from "react";
import { ConfigProvider, message } from "antd";
import zhCN from "antd/locale/zh_CN";
import type { MessageInstance } from "antd/es/message/interface";
import styles from "./GlobalMessageProvider.module.scss";
import { getToastErrorMessage, getToastNoticeClassName } from "./toast-core";
import type { ToastNoticeClassNames } from "./toast-core";

let globalMessage: MessageInstance | null = null;
const toastClassNames: ToastNoticeClassNames = {
  toastError: styles.toastError,
  toastNotice: styles.toastNotice,
  toastSuccess: styles.toastSuccess,
};

/** 绑定当前 antd Message 实例。 */
function GlobalMessageBinder({ messageApi }: { messageApi: MessageInstance }) {
  useEffect(() => {
    globalMessage = messageApi;
    return () => {
      if (globalMessage === messageApi) {
        globalMessage = null;
      }
    };
  }, [messageApi]);

  return null;
}

/** 获取已挂载的全局 Message 实例。 */
function getGlobalMessage() {
  if (!globalMessage) {
    throw new Error("全局 Message 尚未初始化");
  }

  return globalMessage;
}

/** 显示全局成功提示。 */
export function showSuccessToast(content: string) {
  getGlobalMessage().open({
    className: getToastNoticeClassName("success", toastClassNames),
    content,
    type: "success",
  });
}

/** 显示全局失败提示。 */
export function showErrorToast(error: unknown, fallback: string) {
  getGlobalMessage().open({
    className: getToastNoticeClassName("error", toastClassNames),
    content: getToastErrorMessage(error, fallback),
    type: "error",
  });
}

export const toast = {
  success: showSuccessToast,
  error: showErrorToast,
};

/** 为应用提供 antd 全局 Message 上下文。 */
export function GlobalMessageProvider({ children }: { children: ReactNode }) {
  const [messageApi, contextHolder] = message.useMessage({
    classNames: {
      content: styles.toastContent,
      icon: styles.toastIcon,
    },
    duration: 2.6,
    maxCount: 3,
    top: 24,
  });

  return (
    <ConfigProvider locale={zhCN}>
      <>
        {contextHolder}
        <GlobalMessageBinder messageApi={messageApi} />
        {children}
      </>
    </ConfigProvider>
  );
}
