export type HttpRequestOptions = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  body?: unknown;
  /**
   * Destinations this call declares to `assertSafeRequestUrl`.
   *
   * The shared guard's host allowlist is unconditional: a host is permitted
   * only if this process's environment names it, `EXTERNAL_ENDPOINT_HOSTS`
   * lists it, or the caller declares it here. Every provider adapter in this
   * service calls a base URL an operator typed into a connector row, so it can
   * be on no static list — it is declared per call with `declaredHost(baseUrl)`.
   */
  allowedHosts?: ReadonlySet<string>;
};

export type HttpResponse<T> = {
  ok: boolean;
  status: number;
  data: T;
};
