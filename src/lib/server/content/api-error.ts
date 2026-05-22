import { NextResponse } from "next/server";

type ContentApiErrorDebugInfo = {
  context: string;
  fallbackMessage: string;
  resolvedMessage: string;
  errorName: string;
  errorMessage: string;
  errorStack: string;
};

/** 把未知异常规范化成结构化调试信息，方便 route handler 统一打印。 */
function buildContentApiErrorDebugInfo(error: unknown, fallbackMessage: string, context: string): ContentApiErrorDebugInfo {
  if (error instanceof Error) {
    return {
      context,
      fallbackMessage,
      resolvedMessage: error.message.trim() || fallbackMessage,
      errorName: error.name || "Error",
      errorMessage: error.message || fallbackMessage,
      errorStack: error.stack || "",
    };
  }

  return {
    context,
    fallbackMessage,
    resolvedMessage: fallbackMessage,
    errorName: typeof error,
    errorMessage: String(error),
    errorStack: "",
  };
}

/** 把内容管理接口里的未知异常统一转换成带 message 的 JSON 500 响应。 */
export function createContentApiErrorResponse(error: unknown, fallbackMessage: string, context: string) {
  const debugInfo = buildContentApiErrorDebugInfo(error, fallbackMessage, context);

  console.error(`[content-api] ${JSON.stringify(debugInfo)}`);

  return NextResponse.json({ message: debugInfo.resolvedMessage }, { status: 500 });
}
