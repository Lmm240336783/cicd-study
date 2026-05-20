import { HttpClient } from "@/lib/http/client";

/** 导出默认请求实例，统一使用 x.get/x.post 调用。 */
export const x = new HttpClient();

export { HttpClient, HttpClientError } from "@/lib/http/client";
