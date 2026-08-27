export type HttpRequestOptions = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type HttpResponse<T> = {
  status: number;
  data: T;
  ok: boolean;
};

export type HttpStreamOptions = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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

/**
 * A binary passthrough: fetch bytes and write them to a sink, without decoding.
 *
 * `sink` is a minimal writable rather than an Express `Response`, so the
 * utility stays framework-agnostic and testable with a plain object.
 */
export type HttpBinaryStreamOptions = {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  sink: { write: (chunk: Buffer) => unknown; end: () => unknown };
};
