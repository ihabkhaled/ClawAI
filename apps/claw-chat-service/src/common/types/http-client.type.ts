export type HttpRequestOptions = {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

export type HttpResponse<T> = {
  status: number;
  data: T;
  ok: boolean;
};

export type HttpStreamOptions = {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  // Caller-owned signal so a stream can be cancelled mid-flight (used by the
  // cancellation manager). Composed with the internal idle/total timeout.
  signal?: AbortSignal;
};

export type HttpStreamResult = {
  status: number;
  ok: boolean;
  // Buffered error body text — populated only when ok === false.
  errorBody?: string;
  // Decoded UTF-8 text chunks as they arrive — iterate only when ok === true.
  chunks: AsyncGenerator<string>;
};
