type JsonResponseWithMessage = {
  message?: string;
};

/** 尝试把响应体解析成 JSON；空响应或非法 JSON 时返回 null。 */
async function readJsonBody<TResponse>(response: Response): Promise<TResponse | null> {
  const rawText = await response.text();
  if (!rawText.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawText) as TResponse;
  } catch {
    return null;
  }
}

/** 从接口响应里提取可读错误文案，没有时回退到默认文案。 */
function readErrorMessage(data: unknown, fallbackMessage: string) {
  if (typeof data === "object" && data && "message" in data && typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  return fallbackMessage;
}

/** 请求 JSON 接口，并把空响应或非 JSON 错误统一转换为可读异常。 */
export async function requestJson<TResponse>(url: string, init: RequestInit, fallbackMessage = "请求失败"): Promise<TResponse> {
  const headers = new Headers(init.headers);

  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });
  const result = await readJsonBody<TResponse & JsonResponseWithMessage>(response);

  if (!response.ok) {
    throw new Error(readErrorMessage(result, fallbackMessage));
  }

  if (!result) {
    throw new Error(fallbackMessage);
  }

  return result;
}
