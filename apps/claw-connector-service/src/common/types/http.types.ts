export type HttpRequestOptions = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export type HttpResponse<T> = {
  ok: boolean;
  status: number;
  data: T;
};
