import { Logger } from '@nestjs/common';
import { DEFAULT_HTTP_TIMEOUT_MS } from '../constants';
import { type HttpRequestOptions, type HttpResponse } from '../types';

const logger = new Logger('HttpUtility');

// `response.json()` on a body that is not JSON throws SyntaxError, whose message
// ("Unexpected end of JSON input") names neither the URL nor the status — an
// operator reading it in a toast learns nothing. A 404 page, an HTML error from
// a proxy, and an empty body all arrive here, so the parse is guarded and the
// failure is re-stated in terms the caller can act on.
function parseJsonBody<T>(url: string, status: number, bodyText: string): T {
  try {
    return JSON.parse(bodyText) as T;
  } catch {
    const snippet = bodyText.trim().slice(0, 200);
    const detail = snippet.length > 0 ? `: ${snippet}` : ' (empty body)';
    throw new Error(`${url} returned HTTP ${String(status)} with a non-JSON body${detail}`);
  }
}

export function httpGet<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
  const { url, headers, timeoutMs = DEFAULT_HTTP_TIMEOUT_MS } = options;
  logger.debug(`httpGet: requesting ${url} (timeout=${String(timeoutMs)}ms)`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  return fetch(url, {
    method: 'GET',
    headers,
    signal: controller.signal,
  })
    .then(async (response) => {
      const data = parseJsonBody<T>(url, response.status, await response.text());
      const durationMs = Date.now() - startTime;
      logger.debug(
        `httpGet: completed ${url} status=${String(response.status)} durationMs=${String(durationMs)}`,
      );
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

export function httpGetText(options: HttpRequestOptions): Promise<HttpResponse<string>> {
  const { url, headers, timeoutMs = DEFAULT_HTTP_TIMEOUT_MS } = options;
  logger.debug(`httpGetText: requesting ${url} (timeout=${String(timeoutMs)}ms)`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  return fetch(url, {
    method: 'GET',
    headers,
    signal: controller.signal,
  })
    .then(async (response) => {
      const data = await response.text();
      const durationMs = Date.now() - startTime;
      logger.debug(
        `httpGetText: completed ${url} status=${String(response.status)} durationMs=${String(durationMs)}`,
      );
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

export function httpPost<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
  const { url, headers, body, timeoutMs = DEFAULT_HTTP_TIMEOUT_MS } = options;
  logger.debug(`httpPost: requesting ${url} (timeout=${String(timeoutMs)}ms)`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (response) => {
      const data = parseJsonBody<T>(url, response.status, await response.text());
      const durationMs = Date.now() - startTime;
      logger.debug(
        `httpPost: completed ${url} status=${String(response.status)} durationMs=${String(durationMs)}`,
      );
      return { ok: response.ok, status: response.status, data };
    })
    .finally(() => {
      clearTimeout(timeout);
    });
}
