import { SSE_RECONNECT_BASE_MS, SSE_RECONNECT_MAX_BACKOFF_MS, SSE_RECONNECT_MAX_ATTEMPTS } from '@/constants/sse.constants';

import { getAccessToken } from './api.utility';

type SseCallbacks = {
  onMessage: (data: string) => void;
  onError: (error: unknown) => void;
  /** Optional: notified when a reconnect attempt begins. */
  onReconnect?: (attempt: number) => void;
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
  while (!controller.signal.aborted) {
    const completed = await readSseStream(url, controller.signal, callbacks);
    if (!reconnect || controller.signal.aborted) {
      return;
    }
    if (completed) {
      // Server closed the stream cleanly (terminal event). Do not auto-reconnect.
      return;
    }
    attempt++;
    if (attempt > SSE_RECONNECT_MAX_ATTEMPTS) {
      callbacks.onError(new Error('SSE reconnect attempts exhausted'));
      return;
    }
    const delay = Math.min(
      SSE_RECONNECT_BASE_MS * Math.pow(2, attempt - 1),
      SSE_RECONNECT_MAX_BACKOFF_MS,
    );
    callbacks.onReconnect?.(attempt);
    await sleep(delay, controller.signal);
  }
}

async function readSseStream(
  url: string,
  signal: AbortSignal,
  callbacks: SseCallbacks,
): Promise<boolean> {
  try {
    const token = getAccessToken();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) {
        // Server closed the stream normally.
        return true;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
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
