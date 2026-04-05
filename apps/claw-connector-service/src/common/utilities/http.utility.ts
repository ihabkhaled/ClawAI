import { DEFAULT_HTTP_TIMEOUT_MS } from "../constants";
import { type HttpRequestOptions, type HttpResponse } from "../types";

export function httpGet<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
  const { url, headers, timeoutMs = DEFAULT_HTTP_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    method: "GET",
    headers,
    signal: controller.signal,
  })
    .then(async (response) => {
      const data = (await response.json()) as T;
      return {
        ok: response.ok,
        status: response.status,
        data,
      };
    })
    .finally(() => {
      clearTimeout(timeout);
    });
}
