import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SSE_STALL_TIMEOUT_MS } from '@/constants/sse.constants';
import { SseConnectionHealth } from '@/enums';
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

  it('gives up on a connection that stays open but goes silent', async () => {
    // A reconnect only helps a connection that ENDS. A proxy or a sleeping
    // laptop can hold the socket open and simply stop delivering, and the old
    // client waited on `reader.read()` for as long as that lasted: no error, no
    // reconnect, no message, and a spinner that never resolved.
    const neverResolves = {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: () => new Promise<never>(() => {}),
          cancel: () => Promise.resolve(),
        }),
      },
    } as unknown as Response;
    const fetchMock = vi.fn().mockResolvedValue(neverResolves);
    vi.stubGlobal('fetch', fetchMock);

    const connection = connectSse('https://claw.local/stream', {
      onMessage: vi.fn(),
      onError: vi.fn(),
      shouldReconnectAfterClose: () => true,
    });

    // Past the stall deadline plus one reconnect backoff.
    await vi.advanceTimersByTimeAsync(SSE_STALL_TIMEOUT_MS + 5_000);
    connection.close();

    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it('reports health so the page can say something is wrong', async () => {
    const neverResolves = {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: () => new Promise<never>(() => {}),
          cancel: () => Promise.resolve(),
        }),
      },
    } as unknown as Response;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(neverResolves));
    const seen: SseConnectionHealth[] = [];

    const connection = connectSse('https://claw.local/stream', {
      onMessage: vi.fn(),
      onError: vi.fn(),
      onHealthChange: (health) => seen.push(health),
      shouldReconnectAfterClose: () => true,
    });

    await vi.advanceTimersByTimeAsync(SSE_STALL_TIMEOUT_MS + 5_000);
    connection.close();

    expect(seen).toContain(SseConnectionHealth.LIVE);
    expect(seen).toContain(SseConnectionHealth.RECONNECTING);
  });
});

describe('connectSse Last-Event-ID resume', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('sends no Last-Event-ID on the first connection attempt', async () => {
    // Nothing has been seen yet, so there is nothing to resume from — sending
    // the header here would be a lie about what the client already has.
    const fetchMock = vi.fn().mockResolvedValue(streamResponse(`data: {"type":"PING"}\n\n`));
    vi.stubGlobal('fetch', fetchMock);

    const connection = connectSse('https://claw.local/stream', {
      onMessage: vi.fn(),
      onError: vi.fn(),
    });
    await vi.advanceTimersByTimeAsync(0);
    connection.close();

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect('Last-Event-ID' in headers).toBe(false);
  });

  it('sends the last seen id as Last-Event-ID on a reconnect', async () => {
    // The frame the first attempt delivers before going quiet.
    const firstAttempt = streamResponse(`id: thread-1:7\ndata: {"type":"PING"}\n\n`);
    const neverResolves = {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: () => new Promise<never>(() => {}),
          cancel: () => Promise.resolve(),
        }),
      },
    } as unknown as Response;
    const fetchMock = vi.fn().mockResolvedValueOnce(firstAttempt).mockResolvedValue(neverResolves);
    vi.stubGlobal('fetch', fetchMock);

    const connection = connectSse('https://claw.local/stream', {
      onMessage: vi.fn(),
      onError: vi.fn(),
      shouldReconnectAfterClose: () => true,
    });

    // First attempt ends cleanly (its reader reports done after one chunk),
    // triggering a reconnect. Advance past the stall window too, in case the
    // scheduling lands the second attempt on that path instead.
    await vi.advanceTimersByTimeAsync(SSE_STALL_TIMEOUT_MS + 5_000);
    connection.close();

    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
    const secondCallHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>;
    expect(secondCallHeaders['Last-Event-ID']).toBe('thread-1:7');
  });

  it('ignores lines that are not id: or data:, such as comments and event:', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        streamResponse(
          `event: custom\n: this is a comment\nid: thread-1:2\ndata: {"type":"X"}\n\n`,
        ),
      )
      .mockResolvedValue({
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: () => new Promise<never>(() => {}),
            cancel: () => Promise.resolve(),
          }),
        },
      } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const connection = connectSse('https://claw.local/stream', {
      onMessage: vi.fn(),
      onError: vi.fn(),
      shouldReconnectAfterClose: () => true,
    });
    await vi.advanceTimersByTimeAsync(SSE_STALL_TIMEOUT_MS + 5_000);
    connection.close();

    const secondCallHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>;
    expect(secondCallHeaders['Last-Event-ID']).toBe('thread-1:2');
  });
});
