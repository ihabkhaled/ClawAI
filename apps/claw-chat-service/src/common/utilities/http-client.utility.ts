import { Logger } from "@nestjs/common";
import { type HttpRequestOptions, type HttpResponse } from "../types";

const logger = new Logger("HttpClient");

export async function httpRequest<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
  const { url, method, headers, body, timeoutMs = 120_000 } = options;

  logger.debug(`httpRequest: ${method} ${url} (timeout=${String(timeoutMs)}ms)`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    logger.debug(`httpRequest: sending ${method} request to ${url}`);
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    logger.debug(`httpRequest: received response status=${String(response.status)} from ${url}`);
    const data = (await response.json()) as T;
    const durationMs = Date.now() - startTime;
    logger.debug(`httpRequest: ${method} ${url} completed — status=${String(response.status)} durationMs=${String(durationMs)}`);

    return {
      status: response.status,
      data,
      ok: response.ok,
    };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown HTTP error";
    logger.error(`httpRequest: ${method} ${url} failed after ${String(durationMs)}ms — ${message}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
