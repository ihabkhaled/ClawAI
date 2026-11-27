import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POW_WORKER_URL } from '@/constants/bot-check.constants';
import { countLeadingZeroBits, solveChallenge, solveProofOfWork } from '@/lib/bot-check/pow-solver';
import type { PowWorkerResponse } from '@/types/bot-check.types';

async function leadingBits(text: string): Promise<number> {
  const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return countLeadingZeroBits(new Uint8Array(digest));
}

/** The real public/workers/pow-solver.js, run in a VM with `self` faked. */
function runWorkerScript(data: Record<string, unknown>): Promise<PowWorkerResponse> {
  const source = readFileSync(
    path.resolve(__dirname, '..', '..', '..', '..', 'public', 'workers', 'pow-solver.js'),
    'utf8',
  );
  return new Promise((resolve) => {
    const listeners: Array<(event: { data: unknown }) => void> = [];
    const self = {
      addEventListener: (_type: string, listener: (event: { data: unknown }) => void) => {
        listeners.push(listener);
      },
      postMessage: (message: PowWorkerResponse) => resolve(message),
    };
    vm.runInNewContext(source, { self, crypto: webcrypto, TextEncoder, Math, Promise, String });
    for (const listener of listeners) {
      listener({ data });
    }
  });
}

describe('countLeadingZeroBits', () => {
  it.each([
    [[0x80], 0],
    [[0x0f], 4],
    [[0x01], 7],
    [[0x00, 0xff], 8],
    [[0x00, 0x01], 15],
    [[0x00, 0x00, 0x20], 18],
    [[0x00, 0x00], 16],
  ])('%j has %i leading zero bits', (bytes, expected) => {
    expect(countLeadingZeroBits(new Uint8Array(bytes))).toBe(expected);
  });
});

describe('solveProofOfWork', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('finds the FIRST decimal nonce whose SHA-256(salt + nonce) has the leading zero bits', async () => {
    const nonce = await solveProofOfWork('salt-abc', 8, 100_000, 64);
    expect(nonce).toMatch(/^\d+$/u);
    expect(await leadingBits(`salt-abc${nonce}`)).toBeGreaterThanOrEqual(8);
    for (let smaller = 0; smaller < Number(nonce); smaller += 1) {
      expect(await leadingBits(`salt-abc${smaller}`)).toBeLessThan(8);
    }
  });

  it('gives up with null after maxAttempts instead of spinning forever', async () => {
    expect(await solveProofOfWork('salt-abc', 64, 40, 16)).toBeNull();
  });

  it('solves the same nonce as the real worker script', async () => {
    const inline = await solveProofOfWork('worker-parity', 10, 200_000, 128);
    const fromWorker = await runWorkerScript({
      salt: 'worker-parity',
      difficulty: 10,
      maxAttempts: 200_000,
      batchSize: 128,
    });
    expect(fromWorker.nonce).toBe(inline);
    expect(fromWorker.attempts).toBe(Number(inline) + 1);
  });

  it('the worker script reports null when the budget runs out', async () => {
    const result = await runWorkerScript({
      salt: 'x',
      difficulty: 64,
      maxAttempts: 10,
      batchSize: 4,
    });
    expect(result).toEqual({ nonce: null, attempts: 10 });
  });
});

describe('solveChallenge', () => {
  const challenge = { token: 't', salt: 'challenge-salt', difficulty: 6, expiresAt: '' };

  beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('solves on the main thread when the browser has no Worker', async () => {
    vi.stubGlobal('Worker', undefined);
    const nonce = await solveChallenge(challenge);
    expect(await leadingBits(`challenge-salt${nonce}`)).toBeGreaterThanOrEqual(6);
  });

  it('starts the same-origin worker file and returns its nonce', async () => {
    const created: string[] = [];
    class FakeWorker {
      private listeners = new Map<string, (event: { data: unknown }) => void>();
      terminate = vi.fn();
      constructor(url: string) {
        created.push(url);
      }
      addEventListener(type: string, listener: (event: { data: unknown }) => void): void {
        this.listeners.set(type, listener);
      }
      postMessage(message: { salt: string; difficulty: number }): void {
        expect(message).toMatchObject({ salt: 'challenge-salt', difficulty: 6 });
        queueMicrotask(() =>
          this.listeners.get('message')?.({ data: { nonce: '42', attempts: 43 } }),
        );
      }
    }
    vi.stubGlobal('Worker', FakeWorker);
    await expect(solveChallenge(challenge)).resolves.toBe('42');
    expect(created).toEqual([POW_WORKER_URL]);
  });

  it('falls back to the main thread when the worker fails to start', async () => {
    class BrokenWorker {
      private listeners = new Map<string, (event: unknown) => void>();
      terminate = vi.fn();
      addEventListener(type: string, listener: (event: unknown) => void): void {
        this.listeners.set(type, listener);
      }
      postMessage(): void {
        queueMicrotask(() => this.listeners.get('error')?.({}));
      }
    }
    vi.stubGlobal('Worker', BrokenWorker);
    const nonce = await solveChallenge(challenge);
    expect(await leadingBits(`challenge-salt${nonce}`)).toBeGreaterThanOrEqual(6);
  });
});
