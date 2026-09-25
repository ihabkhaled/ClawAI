/**
 * Hosts the caller declares as legitimate destinations for THIS call.
 *
 * `assertSafeRequestUrl` allows the union of the hosts this process's own
 * environment names (`*_SERVICE_URL` and friends), the third-party endpoints
 * written down in `EXTERNAL_ENDPOINT_HOSTS`, and whatever a caller declares
 * here. A URL built from a `*_SERVICE_URL` config value needs nothing; a URL
 * built from an admin-configured connector `baseUrl`, or from a hardcoded
 * third-party constant, MUST pass `declaredHost(<that base url>)` or the call
 * is refused. Declare the BASE url's host, never the finished url's — the
 * latter is a tautology that checks nothing.
 */
type AllowedHostsOption = {
  allowedHosts?: ReadonlySet<string>;
};

export type HttpRequestOptions = AllowedHostsOption & {
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

export type HttpStreamOptions = AllowedHostsOption & {
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
/** Options for reading a binary response fully into memory. */
export type HttpBinaryReadOptions = AllowedHostsOption & {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export type HttpPostBinaryOptions = AllowedHostsOption & {
  url: string;
  headers?: Record<string, string>;
  body: unknown;
  timeoutMs: number;
  /** Aborts the local request early (a cancelled job). The provider may still finish upstream. */
  signal?: AbortSignal;
};

export type HttpBinaryResponse = {
  status: number;
  ok: boolean;
  body: Buffer;
  /** The `Retry-After` header, when the answer carried one (a 429's wait hint). */
  retryAfter?: string | null;
};

export type HttpBinaryStreamOptions = AllowedHostsOption & {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  sink: { write: (chunk: Buffer) => unknown; end: () => unknown };
};
