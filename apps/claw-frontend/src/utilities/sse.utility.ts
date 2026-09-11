import {
  SSE_RECONNECT_BASE_MS,
  SSE_RECONNECT_MAX_ATTEMPTS,
  SSE_RECONNECT_MAX_BACKOFF_MS,
  SSE_STALL_TIMEOUT_MS,
} from '@/constants/sse.constants';
import { SseConnectionHealth } from '@/enums';

import { getAccessToken } from './api.utility';

type SseCallbacks = {
  onMessage: (data: string) => void;
  onError: (error: unknown) => void;
  /** Optional: notified when a reconnect attempt begins. */
  onReconnect?: (attempt: number) => void;
  /**
   * Whether a clean close by the server should end the connection.
   *
   * A clean body end used to be treated as "the run finished, we are done".
   * It is not: the legacy chat stream observable never completes on DONE, so
   * the only things that close it cleanly server-side are an ownership
   * rejection and a service restart — and a restart is exactly when
   * reconnecting matters. One transient blip permanently downgraded the thread
   * to REST polling for the life of the page.
   *
   * The consumer is the only thing that knows whether it actually saw a
   * terminal event, so it decides. Default is to reconnect, because assuming
   * the stream is finished is the failure that was already paid for.
   */
  shouldReconnectAfterClose?: () => boolean;
  /**
   * Notified whenever the connection's health changes.
   *
   * The reconnect machinery already worked; nothing told the user about it. A
   * dropped stream looked exactly like a slow answer, which is the worst of
   * both — the user waits, and waiting is the one thing that will not help.
   */
  onHealthChange?: (health: SseConnectionHealth) => void;
};

type SseConnection = {
  close: () => void;
};

type SseRuntimeOptions = {
  reconnect?: boolean;
};

export function connectSse(
  url: string,
  callbacks: SseCallbacks,
  options: SseRuntimeOptions = {},
): SseConnection {
  const controller = new AbortController();
  const reconnect = options.reconnect !== false;

  void runWithReconnect(url, controller, callbacks, reconnect);

  return {
    close: (): void => {
      controller.abort();
    },
  };
}

async function runWithReconnect(
  url: string,
  controller: AbortController,
  callbacks: SseCallbacks,
  reconnect: boolean,
): Promise<void> {
  let attempt = 0;
  // Carries the last `id:` line across reconnect attempts, so the SECOND and
  // later attempts can tell the server what they already have. Read fresh on
  // every attempt via the mutable box (not a local variable captured once),
  // because `readSseStream` updates it as frames arrive within an attempt too —
  // a stall mid-run must resume from the last frame actually seen, not from
  // wherever the previous attempt started.
  const lastEventId: { current: string | undefined } = { current: undefined };
  while (!controller.signal.aborted) {
    const completed = await readSseStream(url, controller.signal, callbacks, lastEventId);
    if (!reconnect || controller.signal.aborted) {
      return;
    }
    if (completed && callbacks.shouldReconnectAfterClose?.() === false) {
      // The consumer saw a terminal event, so this close is the end of the run.
      return;
    }
    attempt++;
    if (attempt > SSE_RECONNECT_MAX_ATTEMPTS) {
      callbacks.onHealthChange?.(SseConnectionHealth.LOST);
      callbacks.onError(new Error('SSE reconnect attempts exhausted'));
      return;
    }
    callbacks.onHealthChange?.(SseConnectionHealth.RECONNECTING);
    const delay = Math.min(
      SSE_RECONNECT_BASE_MS * Math.pow(2, attempt - 1),
      SSE_RECONNECT_MAX_BACKOFF_MS,
    );
    callbacks.onReconnect?.(attempt);
    await sleep(delay, controller.signal);
  }
}

/** Marker for "the connection went quiet", distinct from any real chunk. */
const STALLED = Symbol('sse-stalled');

type SseReader = ReadableStreamDefaultReader<Uint8Array>;

/**
 * One read, bounded by the stall deadline.
 *
 * The timer is cleared on every settle so a busy stream never accumulates
 * pending timeouts, and an abort resolves immediately rather than waiting out
 * the deadline.
 */
async function readWithStallTimeout(
  reader: SseReader,
  signal: AbortSignal,
): Promise<ReadableStreamReadResult<Uint8Array> | typeof STALLED> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<typeof STALLED>((resolve) => {
        timer = setTimeout(() => resolve(STALLED), SSE_STALL_TIMEOUT_MS);
        onAbort = (): void => {
          resolve(STALLED);
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    if (onAbort !== undefined) {
      signal.removeEventListener('abort', onAbort);
    }
  }
}

async function readSseStream(
  url: string,
  signal: AbortSignal,
  callbacks: SseCallbacks,
  lastEventId: { current: string | undefined },
): Promise<boolean> {
  try {
    const token = getAccessToken();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // The standard reconnect header. `fetch` is not a real EventSource, so
        // nothing sends this on our behalf — it has to be read back out of the
        // `id:` lines this same function saw and forwarded here explicitly.
        // Its absence on a first connection is exactly correct: there is
        // nothing yet to resume from.
        ...(lastEventId.current === undefined ? {} : { 'Last-Event-ID': lastEventId.current }),
      },
      signal,
    });

    if (!response.ok) {
      callbacks.onError(new Error(`SSE connection failed: ${String(response.status)}`));
      return false;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError(new Error('SSE response body is not readable'));
      return false;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    callbacks.onHealthChange?.(SseConnectionHealth.LIVE);

    while (!signal.aborted) {
      // A reconnect only helps a connection that ENDS. A proxy or a sleeping
      // laptop can leave the socket open and simply stop delivering, and this
      // await would then never settle: no error, no reconnect, no message, and
      // a spinner that never resolves. Racing the read against a deadline turns
      // that silence into an ordinary drop, which the loop above already knows
      // how to recover from.
      const chunk = await readWithStallTimeout(reader, signal);
      if (chunk === STALLED) {
        await reader.cancel().catch(() => undefined);
        return false;
      }
      const { done, value } = chunk;
      if (done) {
        // Server closed the stream normally.
        return true;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('id:')) {
          // Tracked even though this function does not act on it itself — a
          // later reconnect attempt reads it back out of this same box.
          const id = trimmed.slice(3).trim();
          if (id.length > 0) {
            lastEventId.current = id;
          }
          continue;
        }
        if (trimmed.startsWith('data:')) {
          const data = trimmed.slice(5).trim();
          if (data.length > 0) {
            callbacks.onMessage(data);
          }
        }
      }
    }
    return false;
  } catch (error: unknown) {
    if (signal.aborted) {
      return false;
    }
    callbacks.onError(error);
    return false;
  }
}

async function sleep(ms: number, signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
