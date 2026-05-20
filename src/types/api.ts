export type Primitive = string | number | boolean | null | undefined;

export type QueryValue = Primitive | Primitive[];

export type QueryParams = Record<string, QueryValue>;

export type FormValue = Primitive | Primitive[];

export type FormDataShape = Record<string, FormValue>;

export type RequestBody = BodyInit | FormDataShape | Record<string, unknown> | null | undefined;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions<TBody = RequestBody> = Omit<RequestInit, "method" | "headers" | "body"> & {
  headers?: HeadersInit;
  query?: QueryParams;
  body?: TBody;
};
