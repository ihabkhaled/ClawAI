import { Logger } from '@nestjs/common';
import { assertSafeRequestUrl } from '@claw/shared-utilities';
import {
  type HttpBinaryReadOptions,
  type HttpBinaryResponse,
  type HttpBinaryStreamOptions,
  type HttpPostBinaryOptions,
  type HttpRequestOptions,
  type HttpResponse,
  type HttpStreamOptions,
  type HttpStreamResult,
} from '../types';

const logger = new Logger('HttpClient');

export async function httpRequest<T>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
  const { url, method, headers, body, timeoutMs = 120_000, signal, allowedHosts } = options;

  // Validated before anything else: the URL is caller-supplied and goes
  // straight to fetch (CodeQL js/request-forgery). See assertSafeRequestUrl —
  // the host allowlist is unconditional, so a connector destination must be
  // declared by its caller through `allowedHosts`.
  const safeUrl = assertSafeRequestUrl(url, allowedHosts);

  logger.debug(`httpRequest: ${method} ${url} (timeout=${String(timeoutMs)}ms)`);
  const controller = new AbortController();
  const onExternalAbort = (): void => controller.abort();
  if (signal?.aborted === true) {
    controller.abort();
  } else {
    signal?.addEventListener('abort', onExternalAbort, { once: true });
  }
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
      // A service or provider call is never legitimately redirected, and
      // following one is how an allowlisted host becomes a hostile one: the
      // check above sees the first URL, the redirect target is whatever the
      // answer says. Refusing is louder than silently going somewhere else.
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
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Pipes a binary response body straight into a writable sink.
 *
 * Separate from `httpStream`, which decodes UTF-8 text — running image bytes
 * through a text decoder replaces every invalid sequence and corrupts the file.
 * This one never looks at the bytes.
 *
 * Returns false without writing anything when the upstream call fails, so the
 * caller can still send its own status: once a byte has been written, the
 * status line is already gone.
 */
/**
 * Reads a binary response into memory as base64.
 *
 * The counterpart to `httpStreamBinary`, for the cases that genuinely need the
 * whole payload rather than a pipe — moderation, hashing, anything that must
 * inspect the bytes. `httpRequest` cannot serve these: it always parses the
 * body as JSON, which turns an image into a throw.
 *
 * Buffering is the deliberate trade. Use this only where the call happens once
 * per artefact, never once per viewer.
 *
 * Returns null on any failure, so a caller cannot mistake "could not fetch" for
 * an empty-but-valid payload.
 */
export async function httpReadBinaryBase64(options: HttpBinaryReadOptions): Promise<string | null> {
  const { url, headers, timeoutMs = 30_000, allowedHosts } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Inside the try on purpose: this function's contract is "null on any
    // failure", and a refused URL is a failure like any other. The refusal is
    // still observable — no fetch is issued and the warn below names it.
    const safeUrl = assertSafeRequestUrl(url, allowedHosts);
    const response = await fetch(safeUrl, {
      method: 'GET',
      headers: { ...headers },
      signal: controller.signal,
      // Same reason as httpRequest: a redirect moves the call to a host the
      // guard above never saw.
      redirect: 'error',
    });
    if (!response.ok) {
      logger.warn(`httpReadBinaryBase64: GET ${url} failed — status ${String(response.status)}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown error';
    logger.warn(`httpReadBinaryBase64: GET ${url} failed — ${message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POSTs a JSON body and reads the answer as raw bytes (text-to-speech: OpenAI
 * `/audio/speech` answers MP3, which `httpRequest` would try to JSON-parse).
 * Returns the status and bytes for any HTTP answer, error bodies included;
 * THROWS on a network failure or the deadline (an `AbortError`), so the caller
 * can tell "the provider said no" from "the provider never answered".
 */
export async function httpPostBinary(options: HttpPostBinaryOptions): Promise<HttpBinaryResponse> {
  const { url, headers, body, timeoutMs, allowedHosts } = options;
  const safeUrl = assertSafeRequestUrl(url, allowedHosts);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(safeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
      // Same reason as httpRequest: a redirect moves the call to an unchecked host.
      redirect: 'error',
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      status: response.status,
      ok: response.ok,
      body: bytes,
      retryAfter: response.headers.get('retry-after'),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function httpStreamBinary(options: HttpBinaryStreamOptions): Promise<boolean> {
  const { url, headers, timeoutMs = 30_000, sink, allowedHosts } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Inside the try for the same reason as httpReadBinaryBase64: the contract
    // is "false without writing anything on failure", and a refused URL is one.
    const safeUrl = assertSafeRequestUrl(url, allowedHosts);
    const response = await fetch(safeUrl, {
      method: 'GET',
      headers: { ...headers },
      signal: controller.signal,
      // A byte stream that follows a redirect is a byte stream from an
      // unchecked host; the pipe below never looks at where it came from.
      redirect: 'error',
    });
    if (!response.ok || response.body === null) {
      logger.warn(`httpStreamBinary: GET ${url} failed — status ${String(response.status)}`);
      return false;
    }

    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value !== undefined) {
        sink.write(Buffer.from(value));
      }
    }
    sink.end();
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown HTTP error';
    logger.error(`httpStreamBinary: GET ${url} failed — ${message}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Streaming variant of httpRequest. Returns decoded UTF-8 text chunks as they
// arrive so the caller can normalize provider SSE/NDJSON in real time.
// Uses an IDLE timeout (reset on every chunk) rather than a total timeout, so
// long generations are not aborted while tokens are still flowing. The caller
// may pass its own AbortSignal (composed) to cancel mid-stream.
export async function httpStream(options: HttpStreamOptions): Promise<HttpStreamResult> {
  const { url, method, headers, body, timeoutMs = 120_000, signal, allowedHosts } = options;

  // Before any timer is armed or any listener attached, so a refused URL costs
  // nothing and leaves nothing to clean up.
  const safeUrl = assertSafeRequestUrl(url, allowedHosts);

  logger.debug(`httpStream: ${method} ${url} (idleTimeout=${String(timeoutMs)}ms)`);

  const controller = new AbortController();
  const onExternalAbort = (): void => controller.abort();
  if (signal !== undefined) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', onExternalAbort, { once: true });
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
      signal.removeEventListener('abort', onExternalAbort);
    }
  };

  let response: Response;
  try {
    response = await fetch(safeUrl, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      // `redirect: 'error'` is applied to the streaming path too: it only
      // governs how the RESPONSE HEAD is resolved, never the body pump below,
      // so it cannot truncate an SSE/NDJSON stream. A provider that answers a
      // completion request with a 30x is a misconfiguration, not a stream.
      redirect: 'error',
    });
  } catch (error: unknown) {
    cleanup();
    const message = error instanceof Error ? error.message : 'Unknown HTTP error';
    logger.error(`httpStream: ${method} ${url} connect failed — ${message}`);
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    cleanup();
    logger.error(`httpStream: ${method} ${url} returned ${String(response.status)}`);
    return { status: response.status, ok: false, errorBody, chunks: emptyChunks() };
  }

  const reader = response.body?.getReader();
  if (reader === undefined) {
    cleanup();
    return {
      status: response.status,
      ok: false,
      errorBody: 'No response body',
      chunks: emptyChunks(),
    };
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
