import type { HttpMethod } from '@/enums';

export type ApiRequestConfig = {
  method: HttpMethod;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
};

export type ApiResponse<T> = {
  data: T;
  status: number;
};

export type ApiError = {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
};

// Per-call request overrides for `apiClient.*`. Used by long-running endpoints
// (LLM generation) that need to opt out of the default 30s axios timeout.
// Pass `timeout: 0` to disable the client-side cutoff entirely.
export type ApiClientRequestOptions = {
  timeout?: number;
  signal?: AbortSignal;
};

export type ApiClientDeleteOptions = {
  data?: unknown;
};
