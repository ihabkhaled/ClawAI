import { getAccessToken } from './api.utility';

type SseCallbacks = {
  onMessage: (data: string) => void;
  onError: (error: unknown) => void;
};

type SseConnection = {
  close: () => void;
};

export function connectSse(url: string, callbacks: SseCallbacks): SseConnection {
  const controller = new AbortController();

  void readSseStream(url, controller.signal, callbacks);

  return {
    close: (): void => {
      controller.abort();
    },
  };
}

async function readSseStream(
  url: string,
  signal: AbortSignal,
  callbacks: SseCallbacks,
): Promise<void> {
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
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError(new Error('SSE response body is not readable'));
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) {
        break;
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
  } catch (error: unknown) {
    if (signal.aborted) {
      return;
    }
    callbacks.onError(error);
  }
}
