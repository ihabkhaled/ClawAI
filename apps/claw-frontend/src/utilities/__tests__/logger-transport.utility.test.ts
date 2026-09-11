import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CLIENT_LOG_FLUSH_INTERVAL_MS,
  CLIENT_LOG_MAX_BATCH_EVENTS,
  CLIENT_LOG_MAX_BUFFER_EVENTS,
  CLIENT_LOG_MAX_RETRY_ATTEMPTS,
  CLIENT_LOG_OCCURRENCES_KEY,
  CLIENT_LOG_RETRY_BASE_MS,
  CLIENT_LOG_SAMPLING_THRESHOLD,
} from '@/constants';
import { logger } from '@/utilities/logger.utility';

/**
 * The client telemetry transport, at the seam where it cost the most.
 *
 * The buffer used to hold entries for five seconds and then issue one HTTP
 * request PER ENTRY. It was never a batch — it was a delay that guaranteed the
 * requests left together. A single chat send produced twelve `/client-logs`
 * calls out of twenty total requests, each spending a rate-limit unit and a
 * Mongo write.
 */
const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn((_path: string, _payload: unknown) => Promise.resolve({})),
}));

vi.mock('@/lib/http-client', () => ({ httpClient: { post: postMock } }));
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: { getState: () => ({ user: { id: 'user-1' } }) },
}));
vi.mock('@/stores/log.store', () => ({
  useLogStore: { getState: () => ({ addEntry: vi.fn() }) },
}));

type BatchPayload = { events: Array<Record<string, unknown>> };

function batchesSent(): BatchPayload[] {
  return postMock.mock.calls.map(([, payload]) => payload as BatchPayload);
}

describe('logger network transport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    postMock.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('sends many distinct entries as one request, not one request each', () => {
    for (let index = 0; index < 12; index += 1) {
      logger.error({ component: 'Chat', action: 'send', message: `failure ${index}` });
    }

    vi.advanceTimersByTime(CLIENT_LOG_FLUSH_INTERVAL_MS);

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock.mock.calls[0]?.[0]).toBe('/client-logs/batch');
    expect(batchesSent()[0]?.events).toHaveLength(12);
  });

  it('collapses identical repeats into one event carrying a count', () => {
    for (let index = 0; index < 20; index += 1) {
      logger.warn({ component: 'Chat', action: 'retry', message: 'stream dropped' });
    }

    vi.advanceTimersByTime(CLIENT_LOG_FLUSH_INTERVAL_MS);

    const events = batchesSent()[0]?.events ?? [];
    expect(events).toHaveLength(1);
    expect((events[0]?.metadata as Record<string, unknown>)[CLIENT_LOG_OCCURRENCES_KEY]).toBe(20);
  });

  it('keeps a single occurrence free of the count field', () => {
    logger.error({ component: 'Chat', action: 'send', message: 'one only' });

    vi.advanceTimersByTime(CLIENT_LOG_FLUSH_INTERVAL_MS);

    const events = batchesSent()[0]?.events ?? [];
    expect(events[0]?.metadata).toBeUndefined();
  });

  it('splits a flush larger than the server ceiling across several requests', () => {
    const total = CLIENT_LOG_MAX_BATCH_EVENTS + 5;
    for (let index = 0; index < total; index += 1) {
      logger.error({ component: 'Chat', action: 'send', message: `distinct ${index}` });
    }

    vi.advanceTimersByTime(CLIENT_LOG_FLUSH_INTERVAL_MS);

    expect(postMock).toHaveBeenCalledTimes(2);
    expect(batchesSent()[0]?.events).toHaveLength(CLIENT_LOG_MAX_BATCH_EVENTS);
    expect(batchesSent()[1]?.events).toHaveLength(5);
  });

  it('caps the buffer, dropping the oldest rather than growing without bound', () => {
    const overflow = CLIENT_LOG_MAX_BUFFER_EVENTS + 30;
    for (let index = 0; index < overflow; index += 1) {
      logger.error({ component: 'Chat', action: 'send', message: `entry ${index}` });
    }

    vi.advanceTimersByTime(CLIENT_LOG_FLUSH_INTERVAL_MS);

    const sent = batchesSent().flatMap((payload) => payload.events);
    expect(sent).toHaveLength(CLIENT_LOG_MAX_BUFFER_EVENTS);
    // The newest survived; the first thirty did not.
    expect(sent.at(-1)?.message).toBe(`entry ${overflow - 1}`);
    expect(sent.some((event) => event.message === 'entry 0')).toBe(false);
  });

  it('does not send anything when nothing was logged', () => {
    vi.advanceTimersByTime(CLIENT_LOG_FLUSH_INTERVAL_MS * 3);

    expect(postMock).not.toHaveBeenCalled();
  });

  it('flushes buffered entries with sendBeacon when the page goes away', () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon });

    logger.error({ component: 'Chat', action: 'send', message: 'unloading' });
    window.dispatchEvent(new Event('pagehide'));

    expect(beacon).toHaveBeenCalledTimes(1);
    // A normal request is cancelled on unload; this is why it is a beacon.
    expect(postMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('retries a failed batch with backoff instead of dropping it (ADR-089 revisit)', async () => {
    // ADR-089 shipped `.catch(() => {})`: one dropped request lost the whole
    // batch permanently, regardless of overall telemetry volume. Failing
    // twice then succeeding must still land the events, not lose them.
    postMock
      .mockRejectedValueOnce(new Error('network down'))
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({});

    logger.error({ component: 'Chat', action: 'send', message: 'worth keeping' });

    await vi.advanceTimersByTimeAsync(CLIENT_LOG_FLUSH_INTERVAL_MS);
    expect(postMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(CLIENT_LOG_RETRY_BASE_MS);
    expect(postMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(CLIENT_LOG_RETRY_BASE_MS * 2);
    expect(postMock).toHaveBeenCalledTimes(3);
    expect(batchesSent()[2]?.events[0]?.message).toBe('worth keeping');
  });

  it('gives up after the retry ceiling rather than retrying forever', async () => {
    postMock.mockRejectedValue(new Error('network down'));

    logger.error({ component: 'Chat', action: 'send', message: 'unlucky' });

    await vi.advanceTimersByTimeAsync(CLIENT_LOG_FLUSH_INTERVAL_MS);
    for (let attempt = 0; attempt < CLIENT_LOG_MAX_RETRY_ATTEMPTS; attempt += 1) {
      await vi.advanceTimersByTimeAsync(CLIENT_LOG_RETRY_BASE_MS * Math.pow(2, attempt));
    }

    expect(postMock).toHaveBeenCalledTimes(1 + CLIENT_LOG_MAX_RETRY_ATTEMPTS);

    // One more full backoff window with no further call proves it gave up
    // rather than continuing indefinitely.
    postMock.mockClear();
    await vi.advanceTimersByTimeAsync(CLIENT_LOG_RETRY_BASE_MS * 100);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('keeps every distinct event at or under the sampling threshold', () => {
    // Collapsing already handles many copies of the SAME event; sampling is
    // for the other shape of a spike — many DIFFERENT low-severity lines.
    // Below the threshold, that spike hasn't happened, so nothing is dropped.
    for (let index = 0; index < CLIENT_LOG_SAMPLING_THRESHOLD; index += 1) {
      logger.debug({ component: 'Chat', action: 'render', message: `distinct ${index}` });
    }

    vi.advanceTimersByTime(CLIENT_LOG_FLUSH_INTERVAL_MS);

    const sent = batchesSent().flatMap((payload) => payload.events);
    expect(sent).toHaveLength(CLIENT_LOG_SAMPLING_THRESHOLD);
  });

  it('samples down low-severity events once a flush holds more distinct events than the threshold', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    try {
      // Above CLIENT_LOG_SAMPLE_RATE, so every sampled event is dropped —
      // proves sampling activated, rather than asserting an exact count.
      randomSpy.mockReturnValue(0.5);

      for (let index = 0; index < CLIENT_LOG_SAMPLING_THRESHOLD + 50; index += 1) {
        logger.debug({ component: 'Chat', action: 'render', message: `distinct ${index}` });
      }

      vi.advanceTimersByTime(CLIENT_LOG_FLUSH_INTERVAL_MS);

      const sent = batchesSent().flatMap((payload) => payload.events);
      expect(sent).toHaveLength(0);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('never samples WARN or ERROR, even over the threshold', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    try {
      // Guaranteed to fail any random-based keep check — proves WARN/ERROR
      // bypass sampling entirely rather than happening to win the roll.
      randomSpy.mockReturnValue(1);

      for (let index = 0; index < CLIENT_LOG_SAMPLING_THRESHOLD + 50; index += 1) {
        logger.error({ component: 'Chat', action: 'send', message: `failure ${index}` });
      }

      vi.advanceTimersByTime(CLIENT_LOG_FLUSH_INTERVAL_MS);

      const sent = batchesSent().flatMap((payload) => payload.events);
      expect(sent).toHaveLength(CLIENT_LOG_SAMPLING_THRESHOLD + 50);
    } finally {
      randomSpy.mockRestore();
    }
  });
});
