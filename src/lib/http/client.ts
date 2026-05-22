import { token } from "@/lib/http/token";
import type { FormDataShape, HttpMethod, QueryParams, RequestBody, RequestOptions } from "@/types";

type HttpClientConfig = {
  baseURL?: string;
  tokenHeader?: string;
  tokenPrefix?: string;
};

/** 封装请求失败信息，便于上层统一处理状态码和错误内容。 */
export class HttpClientError extends Error {
  status: number;
  data: unknown;

  /** 初始化请求错误对象。 */
  constructor(status: number, statusText: string, data: unknown) {
    super(`Request failed (${status}): ${statusText}`);
    this.name = "HttpClientError";
    this.status = status;
    this.data = data;
  }
}

/** 封装基础 HTTP 请求能力并统一注入公共请求头。 */
export class HttpClient {
  private readonly baseURL: string;
  private readonly tokenHeader: string;
  private readonly tokenPrefix: string;

  /** 初始化请求客户端配置。 */
  constructor(config: HttpClientConfig = {}) {
    this.baseURL = config.baseURL ?? "";
    this.tokenHeader = config.tokenHeader ?? "Authorization";
    this.tokenPrefix = config.tokenPrefix ?? "Bearer";
  }

  /** 发送任意 HTTP 请求并按泛型返回响应数据。 */
  async request<TResponse, TBody = RequestBody>(
    path: string,
    options: RequestOptions<TBody> & { method: HttpMethod },
  ): Promise<TResponse> {
    const { method, query, body, headers, ...restOptions } = options;
    const requestHeaders = this.buildHeaders(headers);
    const requestBody = this.normalizeRequestBody(body, requestHeaders);
    const url = this.buildUrl(path, query);

    const response = await fetch(url, {
      ...restOptions,
      method,
      headers: requestHeaders,
      body: requestBody,
    });

    const payload = await this.parseResponse(response);

    if (!response.ok) {
      throw new HttpClientError(response.status, response.statusText, payload);
    }

    return payload as TResponse;
  }

  /** 发送 GET 请求。 */
  async get<TResponse>(path: string, options: Omit<RequestOptions<never>, "body"> = {}): Promise<TResponse> {
    return this.request<TResponse>(path, {
      ...options,
      method: "GET",
    });
  }

  /** 发送 POST 请求，默认按表单格式提交。 */
  async post<TResponse, TBody = FormDataShape>(
    path: string,
    options: RequestOptions<TBody> = {},
  ): Promise<TResponse> {
    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/x-www-form-urlencoded");
    }

    return this.request<TResponse, TBody>(path, {
      ...options,
      headers,
      method: "POST",
    });
  }

  /** 发送 PUT 请求。 */
  async put<TResponse, TBody = RequestBody>(path: string, options: RequestOptions<TBody> = {}): Promise<TResponse> {
    return this.request<TResponse, TBody>(path, {
      ...options,
      method: "PUT",
    });
  }

  /** 发送 PATCH 请求。 */
  async patch<TResponse, TBody = RequestBody>(
    path: string,
    options: RequestOptions<TBody> = {},
  ): Promise<TResponse> {
    return this.request<TResponse, TBody>(path, {
      ...options,
      method: "PATCH",
    });
  }

  /** 发送 DELETE 请求。 */
  async delete<TResponse>(path: string, options: Omit<RequestOptions<never>, "body"> = {}): Promise<TResponse> {
    return this.request<TResponse>(path, {
      ...options,
      method: "DELETE",
    });
  }

  /** 组装完整请求 URL 并拼接查询参数。 */
  private buildUrl(path: string, query?: QueryParams) {
    const rawUrl = this.baseURL ? `${this.baseURL}${path}` : path;
    const isAbsoluteUrl = /^https?:\/\//i.test(rawUrl);

    if (!query || Object.keys(query).length === 0) {
      return rawUrl;
    }

    const url = isAbsoluteUrl
      ? new URL(rawUrl)
      : this.baseURL
        ? new URL(path, this.baseURL)
        : new URL(rawUrl, "http://localhost");

    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => this.appendParam(url.searchParams, key, item));
        return;
      }

      this.appendParam(url.searchParams, key, value);
    });

    if (this.baseURL || isAbsoluteUrl) {
      return url.toString();
    }

    return `${url.pathname}${url.search}${url.hash}`;
  }

  /** 构造请求头并默认注入 token 信息。 */
  private buildHeaders(inputHeaders?: HeadersInit) {
    const headers = new Headers(inputHeaders);
    const accessToken = token.get();

    if (accessToken && !headers.has(this.tokenHeader)) {
      headers.set(this.tokenHeader, `${this.tokenPrefix} ${accessToken}`);
    }

    return headers;
  }

  /** 将 body 规范化为 fetch 可直接发送的格式。 */
  private normalizeRequestBody<TBody>(body: TBody, headers: Headers): BodyInit | undefined {
    if (body == null) {
      return undefined;
    }

    if (this.isBodyInit(body)) {
      return body;
    }

    const contentType = headers.get("Content-Type")?.toLowerCase();

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      return this.toFormUrlEncoded(body as FormDataShape).toString();
    }

    if (this.isPlainObject(body)) {
      if (!contentType) {
        headers.set("Content-Type", "application/json");
      }

      return JSON.stringify(body);
    }

    return String(body);
  }

  /** 解析响应体，自动识别 JSON 与文本类型。 */
  private async parseResponse(response: Response) {
    if (response.status === 204) {
      return undefined;
    }

    const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response.text();
  }

  /** 向查询参数中追加单个键值对。 */
  private appendParam(searchParams: URLSearchParams, key: string, value: unknown) {
    if (value == null) {
      return;
    }

    searchParams.append(key, String(value));
  }

  /** 将对象转为 x-www-form-urlencoded 参数。 */
  private toFormUrlEncoded(data: FormDataShape) {
    const searchParams = new URLSearchParams();

    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => this.appendParam(searchParams, key, item));
        return;
      }

      this.appendParam(searchParams, key, value);
    });

    return searchParams;
  }

  /** 判断数据是否已是 fetch 原生 body 类型。 */
  private isBodyInit(value: unknown): value is BodyInit {
    return (
      typeof value === "string" ||
      value instanceof FormData ||
      value instanceof URLSearchParams ||
      value instanceof Blob ||
      value instanceof ArrayBuffer ||
      ArrayBuffer.isView(value) ||
      value instanceof ReadableStream
    );
  }

  /** 判断数据是否为普通对象。 */
  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Object.prototype.toString.call(value) === "[object Object]";
  }
}
