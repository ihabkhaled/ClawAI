export type HttpRequestOptions = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  /**
   * Hosts this call may reach in addition to the ones this process's own
   * environment names. A URL built from an admin-configured connector baseUrl
   * is on no static list, so its caller declares it with `declaredHost` —
   * otherwise the unconditional host check in `assertSafeRequestUrl` refuses
   * the call (CodeQL js/request-forgery, alert #58).
   */
  allowedHosts?: ReadonlySet<string>;
};

export type HttpResponse<T> = {
  status: number;
  data: T;
  ok: boolean;
};
