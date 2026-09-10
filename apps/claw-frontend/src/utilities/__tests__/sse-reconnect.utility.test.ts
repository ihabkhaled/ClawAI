import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { connectSse } from '@/utilities/sse.utility';

/**
 * The reconnect contract, at the seam where it was wrong.
 *
 * A clean close used to end the connection permanently. But the chat stream
 * observable never completes on `DONE` — only the client closes it — so the
 * things that DO close it cleanly server-side are an ownership rejection and a
 * service restart. Treating those as "the run finished" downgraded the thread
 * to REST polling for the life of the page, silently.
 */
vi.mock('@/utilities/api.utility', () => ({ getAccessToken: () => 'test-token' }));

function streamResponse(body: string): Response {
  const encoder = new TextEncoder();
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => {
        let sent = false;
        return {
          read: () =>
            sent
              ? Promise.resolve({ done: true, value: undefined })
              : ((sent = true), Promise.resolve({ done: false, value: encoder.encode(body) })),
          cancel: () => Promise.resolve(),
        };
      },
    },
  } as unknown as Response;
}

describe('connectSse clean-close handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reconnects after a clean close when no terminal event was seen', async () => {
    // A service restart mid-run. The old behaviour gave up here.
    const fetchMock = vi.fn().mockResolvedValue(streamResponse('data: {"type":"PING"}\n\n'));
    vi.stubGlobal('fetch', fetchMock);

    const connection = connectSse('https://claw.local/stream', {
      onMessage: vi.fn(),
      onError: vi.fn(),
      shouldReconnectAfterClose: () => true,
    });

    await vi.advanceTimersByTimeAsync(5_000);
    connection.close();

    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it('stops after a clean close when the consumer saw a terminal event', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse('data: {"type":"DONE"}\n\n'));
    vi.stubGlobal('fetch', fetchMock);

    const connection = connectSse('https://claw.local/stream', {
      onMessage: vi.fn(),
      onError: vi.fn(),
      shouldReconnectAfterClose: () => false,
    });

    await vi.advanceTimersByTimeAsync(5_000);
    connection.close();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect once the caller has closed it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse('data: {"type":"PING"}\n\n'));
    vi.stubGlobal('fetch', fetchMock);

    const connection = connectSse('https://claw.local/stream', {
      onMessage: vi.fn(),
      onError: vi.fn(),
      shouldReconnectAfterClose: () => true,
    });
    connection.close();

    await vi.advanceTimersByTimeAsync(30_000);
    const callsAfterClose = fetchMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(30_000);

    expect(fetchMock.mock.calls.length).toBe(callsAfterClose);
  });
});
