import { type HttpMethod } from '../enums';

export type HttpRequestOptions = {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

export type HttpResponse<T> = {
  status: number;
  data: T;
  ok: boolean;
};
