import { Logger } from "@nestjs/common";
import { DEFAULT_HTTP_TIMEOUT_MS } from "../constants";
import { type HttpRequestOptions, type HttpResponse } from "../types";

const logger = new Logger("HttpUtility");

export function httpGet<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
  const { url, headers, timeoutMs = DEFAULT_HTTP_TIMEOUT_MS } = options;
  logger.debug(`httpGet: requesting ${url} (timeout=${String(timeoutMs)}ms)`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  return fetch(url, {
    method: "GET",
    headers,
    signal: controller.signal,
  })
    .then(async (response) => {
      const data = (await response.json()) as T;
      const durationMs = Date.now() - startTime;
      logger.debug(`httpGet: completed ${url} status=${String(response.status)} durationMs=${String(durationMs)}`);
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
