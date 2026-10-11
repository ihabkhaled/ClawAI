import { Logger } from '@nestjs/common';
import { type HttpRequestOptions, type HttpResponse } from '@claw/shared-types';

import { assertSafeRequestUrl } from './request-url.utility';
import { redactUrlSecrets } from './redact-url-secrets.utility';

const logger = new Logger('FetchHttpClient');

export async function httpRequest<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
  const { url, method, headers, body, timeoutMs = 120_000, allowedHosts } = options;

  // Validated before anything else: the URL is caller-supplied and goes
  // straight to fetch. See assertSafeRequestUrl.
  const safeUrl = assertSafeRequestUrl(url, allowedHosts);

  logger.debug(`httpRequest: ${method} ${redactUrlSecrets(url)} (timeout=${String(timeoutMs)}ms)`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
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

    const data = (await response.json()) as T;
    const durationMs = Date.now() - startTime;
    logger.log(
      `httpRequest: ${method} ${redactUrlSecrets(url)} ok status=${String(response.status)} durationMs=${String(durationMs)}`,
    );

    return {
      status: response.status,
      data,
      ok: response.ok,
    };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown HTTP error';
    logger.error(
      `httpRequest: ${method} ${redactUrlSecrets(url)} failed after ${String(durationMs)}ms — ${redactUrlSecrets(message)}`,
    );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
