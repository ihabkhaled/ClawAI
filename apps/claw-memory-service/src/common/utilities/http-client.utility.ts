import { Logger } from "@nestjs/common";
import { type HttpRequestOptions, type HttpResponse } from "../types";

export async function httpRequest<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
  const logger = new Logger("HttpClient");
  const { url, method, headers, body, timeoutMs = 30_000 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = (await response.json()) as T;

    return {
      status: response.status,
      data,
      ok: response.ok,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown HTTP error";
    logger.error(`HTTP ${method} ${url} failed: ${message}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
