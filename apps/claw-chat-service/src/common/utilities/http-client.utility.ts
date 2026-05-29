import { Logger } from "@nestjs/common";
import { type HttpRequestOptions, type HttpResponse, type HttpStreamOptions, type HttpStreamResult } from "../types";

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

// Streaming variant of httpRequest. Returns decoded UTF-8 text chunks as they
// arrive so the caller can normalize provider SSE/NDJSON in real time.
// Uses an IDLE timeout (reset on every chunk) rather than a total timeout, so
// long generations are not aborted while tokens are still flowing. The caller
// may pass its own AbortSignal (composed) to cancel mid-stream.
export async function httpStream(options: HttpStreamOptions): Promise<HttpStreamResult> {
  const { url, method, headers, body, timeoutMs = 120_000, signal } = options;
  logger.debug(`httpStream: ${method} ${url} (idleTimeout=${String(timeoutMs)}ms)`);

  const controller = new AbortController();
  const onExternalAbort = (): void => controller.abort();
  if (signal !== undefined) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", onExternalAbort, { once: true });
    }
  }

  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const armIdleTimer = (): void => {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(() => controller.abort(), timeoutMs);
  };
  armIdleTimer();

  const cleanup = (): void => {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer);
    }
    if (signal !== undefined) {
      signal.removeEventListener("abort", onExternalAbort);
    }
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error: unknown) {
    cleanup();
    const message = error instanceof Error ? error.message : "Unknown HTTP error";
    logger.error(`httpStream: ${method} ${url} connect failed — ${message}`);
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    cleanup();
    logger.error(`httpStream: ${method} ${url} returned ${String(response.status)}`);
    return { status: response.status, ok: false, errorBody, chunks: emptyChunks() };
  }

  const reader = response.body?.getReader();
  if (reader === undefined) {
    cleanup();
    return { status: response.status, ok: false, errorBody: "No response body", chunks: emptyChunks() };
  }

  return { status: response.status, ok: true, chunks: readChunks(reader, armIdleTimer, cleanup) };
}

async function* emptyChunks(): AsyncGenerator<string> {
  // Intentionally yields nothing.
}

async function* readChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  armIdleTimer: () => void,
  cleanup: () => void,
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      armIdleTimer();
      if (value !== undefined) {
        const text = decoder.decode(value, { stream: true });
        if (text.length > 0) {
          yield text;
        }
      }
    }
    const tail = decoder.decode();
    if (tail.length > 0) {
      yield tail;
    }
  } finally {
    cleanup();
    reader.releaseLock();
  }
}
