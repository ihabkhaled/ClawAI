import { describe, expect, it, vi } from 'vitest';

import {
  isRetryableTransactionError,
  jitteredDelayMs,
  retryOnSerializationFailure,
  SerializationRetryExhaustedError,
} from '../serializable-retry.utility';

const conflict = (): Error & { code: string } =>
  Object.assign(new Error('conflict'), { code: 'P2034' });

describe('isRetryableTransactionError', () => {
  it('accepts a Prisma serialization failure', () => {
    expect(isRetryableTransactionError(conflict())).toBe(true);
  });

  it('rejects other codes unless the caller names them', () => {
    const unique = Object.assign(new Error('unique'), { code: 'P2002' });
    expect(isRetryableTransactionError(unique)).toBe(false);
    expect(isRetryableTransactionError(unique, ['P2002'])).toBe(true);
  });

  it.each([null, undefined, 'P2034', 42, new Error('plain'), { code: 5 }])(
    'rejects %j',
    (value) => {
      expect(isRetryableTransactionError(value)).toBe(false);
    },
  );
});

describe('jitteredDelayMs', () => {
  it('grows with the attempt and is capped', () => {
    expect(jitteredDelayMs(1, 20, 400, () => 0.999)).toBe(20);
    expect(jitteredDelayMs(3, 20, 400, () => 0.999)).toBe(80);
    expect(jitteredDelayMs(10, 20, 400, () => 0.999)).toBe(400);
  });

  it('is never zero and never above the ceiling', () => {
    expect(jitteredDelayMs(1, 20, 400, () => 0)).toBe(1);
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      const delay = jitteredDelayMs(attempt, 20, 400, () => 0.9999);
      expect(delay).toBeGreaterThanOrEqual(1);
      expect(delay).toBeLessThanOrEqual(400);
    }
  });

  it('spreads callers apart: different random draws give different delays', () => {
    expect(jitteredDelayMs(4, 20, 400, () => 0.1)).not.toBe(jitteredDelayMs(4, 20, 400, () => 0.9));
  });
});

describe('retryOnSerializationFailure', () => {
  const instant = { sleep: vi.fn().mockResolvedValue(undefined), random: () => 0.5 };

  it('returns at once when the first attempt works', async () => {
    const work = vi.fn().mockResolvedValue('ok');
    await expect(retryOnSerializationFailure(work, instant)).resolves.toBe('ok');
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('runs again after a conflict and returns the later success', async () => {
    const work = vi
      .fn()
      .mockRejectedValueOnce(conflict())
      .mockRejectedValueOnce(conflict())
      .mockResolvedValue('ok');
    await expect(retryOnSerializationFailure(work, instant)).resolves.toBe('ok');
    expect(work).toHaveBeenCalledTimes(3);
  });

  it('waits between attempts, with a jittered delay each time', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const work = vi.fn().mockRejectedValueOnce(conflict()).mockResolvedValue('ok');
    await retryOnSerializationFailure(work, { sleep, random: () => 0.5, baseDelayMs: 40 });
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(21);
  });

  it('gives up after the bound with an error that says it was only busy', async () => {
    const work = vi.fn().mockRejectedValue(conflict());
    const failure = await retryOnSerializationFailure(work, { ...instant, maxAttempts: 4 }).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(SerializationRetryExhaustedError);
    expect((failure as SerializationRetryExhaustedError).attempts).toBe(4);
    expect(work).toHaveBeenCalledTimes(4);
  });

  it('does not sleep after the last attempt', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    await retryOnSerializationFailure(vi.fn().mockRejectedValue(conflict()), {
      sleep,
      random: () => 0.5,
      maxAttempts: 3,
    }).catch(() => null);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('rethrows any other error immediately without retrying', async () => {
    const work = vi.fn().mockRejectedValue(new Error('connection lost'));
    await expect(retryOnSerializationFailure(work, instant)).rejects.toThrow('connection lost');
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('retries the extra codes the caller allows', async () => {
    const unique = Object.assign(new Error('unique'), { code: 'P2002' });
    const work = vi.fn().mockRejectedValueOnce(unique).mockResolvedValue('ok');
    await expect(
      retryOnSerializationFailure(work, { ...instant, extraCodes: ['P2002'] }),
    ).resolves.toBe('ok');
  });
});
