import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { connectSse } from '@/utilities/sse.utility';

const STORAGE_KEY = 'claw-auth-storage';

function setStorage(state: Record<string, unknown>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state }));
}

function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller): void {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

describe('sse.utility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends Authorization header with Bearer token from storage', async () => {
    setStorage({ accessToken: 'test-jwt-token' });

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(createMockStream([]), { status: 200 }));

    const connection = connectSse('http://localhost/stream', {
      onMessage: vi.fn(),
      onError: vi.fn(),
    });

    // Wait for fetch to be called
    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledOnce();
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-jwt-token');
    expect(headers['Accept']).toBe('text/event-stream');

    connection.close();
  });

  it('does not include Authorization header when no token exists', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(createMockStream([]), { status: 200 }));

    const connection = connectSse('http://localhost/stream', {
      onMessage: vi.fn(),
      onError: vi.fn(),
    });

    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledOnce();
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();

    connection.close();
  });

  it('parses SSE data lines and calls onMessage', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        createMockStream([
          'data: {"type":"done"}\n\n',
          'data: {"type":"error","error":"fail"}\n\n',
        ]),
        { status: 200 },
      ),
    );

    const onMessage = vi.fn();
    const connection = connectSse('http://localhost/stream', {
      onMessage,
      onError: vi.fn(),
    });

    await vi.waitFor(() => {
      expect(onMessage).toHaveBeenCalledTimes(2);
    });

    expect(onMessage).toHaveBeenCalledWith('{"type":"done"}');
    expect(onMessage).toHaveBeenCalledWith('{"type":"error","error":"fail"}');

    connection.close();
  });

  it('calls onError when fetch returns non-ok status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));

    const onError = vi.fn();
    const connection = connectSse('http://localhost/stream', {
      onMessage: vi.fn(),
      onError,
    });

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledOnce();
    });

    const error = onError.mock.calls[0]?.[0] as Error;
    expect(error.message).toContain('401');

    connection.close();
  });

  it('close() aborts the connection without calling onError', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    const onError = vi.fn();
    const connection = connectSse('http://localhost/stream', {
      onMessage: vi.fn(),
      onError,
    });

    connection.close();

    // Give time for async error handling
    await new Promise((r) => {
      setTimeout(r, 50);
    });

    expect(onError).not.toHaveBeenCalled();
  });

  it('handles chunked SSE data split across multiple reads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(createMockStream(['data: {"type', '":"done"}\n\n']), { status: 200 }),
    );

    const onMessage = vi.fn();
    const connection = connectSse('http://localhost/stream', {
      onMessage,
      onError: vi.fn(),
    });

    await vi.waitFor(() => {
      expect(onMessage).toHaveBeenCalledOnce();
    });

    expect(onMessage).toHaveBeenCalledWith('{"type":"done"}');

    connection.close();
  });
});
