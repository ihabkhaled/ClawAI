import { Logger } from '@nestjs/common';
import { assertSafeRequestUrl } from '@claw/shared-utilities';
import { type HttpRequestOptions, type HttpResponse } from '../types';

const logger = new Logger('HttpClient');

export async function httpRequest<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
  const { url, method, headers, body, allowedHosts, timeoutMs = 120_000 } = options;

  // Validated before anything else: the URL is caller-supplied and goes
  // straight to fetch. See assertSafeRequestUrl.
  const safeUrl = assertSafeRequestUrl(url, allowedHosts);

  logger.debug(`httpRequest: ${method} ${url} (timeout=${String(timeoutMs)}ms)`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    logger.debug(`httpRequest: sending ${method} request to ${url}`);
    const response = await fetch(safeUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      // A service call is never legitimately redirected, and following one is
      // how an allowlisted host becomes a hostile one: the check above sees
      // the first URL, the redirect target is whatever the answer says
      // (alert #58). Refusing is louder than silently going somewhere else.
      redirect: 'error',
    });

    logger.debug(`httpRequest: received response status=${String(response.status)} from ${url}`);
    const data = (await response.json()) as T;
    const durationMs = Date.now() - startTime;
    logger.debug(
      `httpRequest: ${method} ${url} completed — status=${String(response.status)} durationMs=${String(durationMs)}`,
    );

    return {
      status: response.status,
      data,
      ok: response.ok,
    };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown HTTP error';
    logger.error(`httpRequest: ${method} ${url} failed after ${String(durationMs)}ms — ${message}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
