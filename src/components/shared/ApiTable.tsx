"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Table } from "antd";
import type { TableColumnsType, TableProps } from "antd";
import {
  buildApiTableParams,
  createApiTableRequest,
  normalizeApiTableResult,
} from "./api-table-core";
import type {
  ApiTableApi,
  ApiTableFetcher,
  ApiTableParams,
  ApiTableResult,
  ApiTableTransform,
} from "./api-table-core";

const DEFAULT_LIMIT = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;

export type ApiTableRef = {
  reload: () => void;
  init: (params?: ApiTableParams) => void;
  search: (params?: ApiTableParams) => void;
};

export type ApiTableRenderState<TRecord> = {
  dataSource: TRecord[];
  error: Error | null;
  init: (params?: ApiTableParams) => void;
  limit: number;
  loading: boolean;
  page: number;
  params: ApiTableParams;
  reload: () => void;
  search: (params?: ApiTableParams) => void;
  total: number;
};

export type ApiTableProps<TRecord extends object, TResponse = unknown> = Omit<
  TableProps<TRecord>,
  "columns" | "dataSource" | "loading" | "pagination" | "rowKey" | "title"
> & {
  api: ApiTableApi<TResponse>;
  columns: TableColumnsType<TRecord>;
  defaultLimit?: (typeof PAGE_SIZE_OPTIONS)[number];
  fetcher?: ApiTableFetcher;
  hide?: boolean;
  params?: ApiTableParams;
  requestInit?: RequestInit;
  rowKey?: TableProps<TRecord>["rowKey"];
  rs?: (state: ApiTableRenderState<TRecord>) => ReactNode;
  title?: ReactNode;
  transform?: ApiTableTransform<TResponse, TRecord>;
  uniqueKey?: TableProps<TRecord>["rowKey"];
};

/** 渲染带接口请求、分页状态和 ref 操作的通用 antd Table。 */
function ApiTableInner<TRecord extends object = Record<string, unknown>, TResponse = unknown>(
  {
    api,
    columns,
    defaultLimit = DEFAULT_LIMIT,
    fetcher,
    hide,
    params,
    requestInit,
    rowKey,
    rs,
    title,
    transform,
    uniqueKey,
    ...tableProps
  }: ApiTableProps<TRecord, TResponse>,
  ref: React.ForwardedRef<ApiTableRef>,
) {
  const initialParams = useMemo(() => params ?? {}, [params]);
  const [dataSource, setDataSource] = useState<TRecord[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(defaultLimit);
  const [queryParams, setQueryParams] = useState<ApiTableParams>(initialParams);
  const [refreshKey, setRefreshKey] = useState(0);
  const [total, setTotal] = useState(0);
  const requestIdRef = useRef(0);

  const request = useMemo(
    () => createApiTableRequest<TResponse>({ api, fetcher, requestInit }),
    [api, fetcher, requestInit],
  );

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey((current) => current + 1);
  }, []);

  const init = useCallback((nextParams?: ApiTableParams) => {
    setLoading(true);
    setError(null);
    setPage(1);
    setQueryParams((current) => ({ ...current, ...(nextParams ?? {}) }));
    setRefreshKey((current) => current + 1);
  }, []);

  const search = useCallback(
    (nextParams?: ApiTableParams) => {
      init(nextParams);
    },
    [init],
  );

  const renderState = useMemo<ApiTableRenderState<TRecord>>(
    () => ({
      dataSource,
      error,
      init,
      limit,
      loading,
      page,
      params: queryParams,
      reload,
      search,
      total,
    }),
    [dataSource, error, init, limit, loading, page, queryParams, reload, search, total],
  );

  useImperativeHandle(ref, () => ({ init, reload, search }), [init, reload, search]);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    void request(buildApiTableParams(queryParams, { page, limit }))
      .then((response) => normalizeApiTableResult(response, transform))
      .then((result: ApiTableResult<TRecord>) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setDataSource(result.list);
        setTotal(result.total);
      })
      .catch((requestError: unknown) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setDataSource([]);
        setTotal(0);
        setError(requestError instanceof Error ? requestError : new Error("Table request failed"));
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      });
  }, [limit, page, queryParams, refreshKey, request, transform]);

  if (hide) {
    return null;
  }

  const tools = rs?.(renderState);
  const hasHeader = Boolean(title || tools);

  return (
    <div className="w-full">
      {hasHeader ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <div className="text-base font-semibold text-slate-950">{title}</div> : <div />}
          {tools ? <div className="flex items-center gap-2">{tools}</div> : null}
        </div>
      ) : null}
      <Table<TRecord>
        {...tableProps}
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={{
          current: page,
          pageSize: limit,
          pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
          showSizeChanger: true,
          total,
          onChange: (nextPage, nextLimit) => {
            setLoading(true);
            setError(null);
            setPage(nextPage);
            setLimit(nextLimit);
          },
        }}
        rowKey={rowKey ?? uniqueKey ?? "id"}
      />
    </div>
  );
}

export const ApiTable = forwardRef(ApiTableInner) as <
  TRecord extends object = Record<string, unknown>,
  TResponse = unknown,
>(
  props: ApiTableProps<TRecord, TResponse> & React.RefAttributes<ApiTableRef>,
) => React.ReactElement | null;
