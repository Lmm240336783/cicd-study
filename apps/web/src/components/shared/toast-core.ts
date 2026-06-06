export type ToastNoticeType = "success" | "error";

export type ToastNoticeClassNames = {
  toastError: string;
  toastNotice: string;
  toastSuccess: string;
};

/** 从未知错误中提取全局提示文案。 */
export function getToastErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

/** 根据提示类型返回官网风格的 Message 样式类名。 */
export function getToastNoticeClassName(type: ToastNoticeType, classNames: ToastNoticeClassNames) {
  const typeClassName = type === "success" ? classNames.toastSuccess : classNames.toastError;
  return `${classNames.toastNotice} ${typeClassName}`;
}
