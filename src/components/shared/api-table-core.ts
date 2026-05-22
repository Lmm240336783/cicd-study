export type ApiTableQueryValue = string | number | boolean | null | undefined;

export type ApiTableParams = Record<string, ApiTableQueryValue | ApiTableQueryValue[]>;

export type ApiTablePageState = {
  page: number;
  limit: number;
};

export type ApiTableApi<TResponse> =
  | string
  | ((params: ApiTableParams) => Promise<TResponse> | TResponse);

export type ApiTableFetchResponse = {
  ok?: boolean;
  status?: number;
  json: () => Promise<unknown>;
};

export type ApiTableFetcher = (url: string, init?: RequestInit) => Promise<ApiTableFetchResponse>;

export type ApiTableResult<TRecord> = {
  list: TRecord[];
  total: number;
};

export type ApiTableTransform<TResponse, TRecord> = (response: TResponse) => ApiTableResult<TRecord>;

type CreateApiTableRequestOptions<TResponse> = {
  api: ApiTableApi<TResponse>;
  fetcher?: ApiTableFetcher;
  requestInit?: RequestInit;
};

/** 从接口失败响应中读取后端返回的可展示错误文案。 */
function readApiTableErrorMessage(data: unknown) {
  if (typeof data === "object" && data && "message" in data && typeof data.message === "string") {
    return data.message;
  }

  return "";
}

/** 合并列表查询参数，并确保当前分页值覆盖外部同名参数。 */
export function buildApiTableParams(params: ApiTableParams | undefined, pageState: ApiTablePageState): ApiTableParams {
  return {
    ...(params ?? {}),
    page: pageState.page,
    limit: pageState.limit,
  };
}

/** 将查询参数拼接到 URL 上，自动忽略空值并展开数组。 */
export function appendApiTableQuery(url: string, params: ApiTableParams): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];

    values.forEach((item) => {
      if (item === null || item === undefined) {
        return;
      }

      query.append(key, String(item));
    });
  });

  const queryString = query.toString();

  if (!queryString) {
    return url;
  }

  return `${url}${url.includes("?") ? "&" : "?"}${queryString}`;
}

/** 创建统一请求函数，兼容 URL api 和函数 api。 */
export function createApiTableRequest<TResponse>({
  api,
  fetcher = fetch as ApiTableFetcher,
  requestInit,
}: CreateApiTableRequestOptions<TResponse>) {
  return async (params: ApiTableParams): Promise<TResponse> => {
    if (typeof api === "function") {
      return api(params);
    }

    const response = await fetcher(appendApiTableQuery(api, params), { method: "GET", ...requestInit });

    if (response.ok === false) {
      const errorBody = await response.json().catch(() => null);
      const message = readApiTableErrorMessage(errorBody);
      throw new Error(message || `Table request failed with status ${response.status ?? "unknown"}`);
    }

    return (await response.json()) as TResponse;
  };
}

/** 将接口响应标准化为 antd Table 可使用的数据和总数。 */
export function normalizeApiTableResult<TResponse, TRecord>(
  response: TResponse,
  transform?: ApiTableTransform<TResponse, TRecord>,
): ApiTableResult<TRecord> {
  if (transform) {
    return transform(response);
  }

  if (Array.isArray(response)) {
    return { list: response as TRecord[], total: response.length };
  }

  const source = response as Record<string, unknown>;
  const data = source.data as Record<string, unknown> | undefined;
  const list = source.list ?? source.rows ?? source.items ?? data?.list ?? data?.rows ?? data?.items ?? data?.records ?? [];
  const total = source.total ?? source.count ?? data?.total ?? data?.count;

  return {
    list: Array.isArray(list) ? (list as TRecord[]) : [],
    total: typeof total === "number" ? total : Array.isArray(list) ? list.length : 0,
  };
}
