import { type HttpMethod } from '../enums';

export type HttpRequestOptions = {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  /**
   * Hosts this call may reach, on top of the ones the environment and the
   * static external-endpoint list already permit. A caller sets this when its
   * destination comes from an admin-configured connector, which no static list
   * can know — see `declaredHost` in @claw/shared-utilities. The host check
   * itself is not optional (alert #58).
   */
  allowedHosts?: ReadonlySet<string>;
};

export type HttpResponse<T> = {
  status: number;
  data: T;
  ok: boolean;
};
