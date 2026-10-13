import { vi } from 'vitest';
import { declaredHost } from '@claw/shared-utilities';

import { StreamCeilingError, StreamIdleTimeoutError } from '../../errors';
import { httpStream } from '../http-client.utility';

const ALLOWED = declaredHost('https://provider.example');
const URL_UNDER_TEST = 'https://provider.example/api/chat';

/**
 * A fetch whose body the test feeds by hand and which, like the real one,
 * errors the body (or rejects the call) with the abort signal's reason.
 */
function controllableFetch(options: { holdHeaders?: boolean } = {}): {
  push: (text: string) => void;
  finish: () => void;
} {
  const encoder = new TextEncoder();
  let bodyController: ReadableStreamDefaultController<Uint8Array> | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          const signal = init?.signal;
          if (signal?.aborted === true) {
            reject(signal.reason);
            return;
          }
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
          if (options.holdHeaders === true) {
            return;
          }
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              bodyController = controller;
              signal?.addEventListener('abort', () => controller.error(signal.reason), {
                once: true,
              });
            },
          });
          resolve(new Response(body, { status: 200 }));
        }),
    ),
  );
  return {
    push: (text) => bodyController?.enqueue(encoder.encode(text)),
    finish: () => bodyController?.close(),
  };
}

async function open(options: {
  timeoutMs: number;
  maxTotalMs?: number;
  signal?: AbortSignal;
}): Promise<AsyncGenerator<string>> {
  const result = await httpStream({
    url: URL_UNDER_TEST,
    allowedHosts: ALLOWED,
    method: 'POST',
    body: { stream: true },
    ...options,
  });
  expect(result.ok).toBe(true);
  return result.chunks;
}

describe('httpStream clocks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps a stream alive for as long as chunks keep arriving inside the idle window', async () => {
    const upstream = controllableFetch();
    const chunks = await open({ timeoutMs: 1_000 });

    // Five chunks, 900 ms apart: 4.5 s of wall clock against a 1 s idle limit.
    for (let n = 0; n < 5; n++) {
      const next = chunks.next();
      await vi.advanceTimersByTimeAsync(900);
      upstream.push(`chunk-${String(n)}`);
      await expect(next).resolves.toEqual({ done: false, value: `chunk-${String(n)}` });
    }
    const last = chunks.next();
    upstream.finish();
    await expect(last).resolves.toEqual({ done: true, value: undefined });
  });

  it('expires after the idle window of silence with a typed idle error', async () => {
    const upstream = controllableFetch();
    const chunks = await open({ timeoutMs: 1_000 });
    const first = chunks.next();
    upstream.push('hello');
    await first;

    const second = chunks.next();
    const outcome = expect(second).rejects.toBeInstanceOf(StreamIdleTimeoutError);
    await vi.advanceTimersByTimeAsync(1_000);
    await outcome;
  });

  it('counts the wait for the first byte as silence', async () => {
    controllableFetch({ holdHeaders: true });
    const call = httpStream({
      url: URL_UNDER_TEST,
      allowedHosts: ALLOWED,
      method: 'POST',
      timeoutMs: 1_000,
    });
    const outcome = expect(call).rejects.toBeInstanceOf(StreamIdleTimeoutError);
    await vi.advanceTimersByTimeAsync(1_000);
    await outcome;
  });

  it('stops a stream that never goes quiet once it passes the absolute ceiling', async () => {
    const upstream = controllableFetch();
    const chunks = await open({ timeoutMs: 1_000, maxTotalMs: 2_000 });

    // A chunk every 400 ms never trips the 1 s idle clock.
    let failure: unknown;
    const reader = (async (): Promise<void> => {
      try {
        for await (const chunk of chunks) {
          expect(chunk).toBe('tick');
        }
      } catch (error: unknown) {
        failure = error;
      }
    })();
    for (let tick = 0; tick < 4; tick++) {
      await vi.advanceTimersByTimeAsync(400);
      upstream.push('tick');
    }
    // 1.6 s in; the ceiling is 2 s and the stream has never been silent.
    await vi.advanceTimersByTimeAsync(500);
    await reader;

    expect(failure).toBeInstanceOf(StreamCeilingError);
    expect(failure).not.toBeInstanceOf(StreamIdleTimeoutError);
  });

  it('passes the caller abort reason through, distinct from both clocks', async () => {
    const upstream = controllableFetch();
    const caller = new AbortController();
    const chunks = await open({ timeoutMs: 60_000, maxTotalMs: 600_000, signal: caller.signal });
    const first = chunks.next();
    upstream.push('hello');
    await first;

    const reason = new Error('job cancelled');
    const second = chunks.next();
    const outcome = expect(second).rejects.toBe(reason);
    caller.abort(reason);
    await outcome;
  });

  it('refuses to start when the caller has already aborted', async () => {
    controllableFetch({ holdHeaders: true });
    const caller = new AbortController();
    const reason = new Error('already cancelled');
    caller.abort(reason);

    await expect(
      httpStream({
        url: URL_UNDER_TEST,
        allowedHosts: ALLOWED,
        method: 'POST',
        timeoutMs: 60_000,
        signal: caller.signal,
      }),
    ).rejects.toBe(reason);
  });

  it('leaves no timer behind after a clean finish', async () => {
    const upstream = controllableFetch();
    const chunks = await open({ timeoutMs: 1_000, maxTotalMs: 5_000 });
    const first = chunks.next();
    upstream.push('done');
    await first;
    const end = chunks.next();
    upstream.finish();
    await end;

    expect(vi.getTimerCount()).toBe(0);
  });

  it('without a ceiling, an active stream is never cut by total time', async () => {
    const upstream = controllableFetch();
    const chunks = await open({ timeoutMs: 1_000 });
    for (let n = 0; n < 50; n++) {
      const next = chunks.next();
      await vi.advanceTimersByTimeAsync(500);
      upstream.push('x');
      await expect(next).resolves.toEqual({ done: false, value: 'x' });
    }
  });
});
