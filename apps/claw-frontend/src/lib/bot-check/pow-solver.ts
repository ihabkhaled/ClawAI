import { POW_BATCH_SIZE, POW_MAX_ATTEMPTS, POW_WORKER_URL } from '@/constants/bot-check.constants';
import type { PowChallenge, PowWorkerRequest, PowWorkerResponse } from '@/types/bot-check.types';

/**
 * Proof-of-work solver: find a decimal `nonce` such that
 * SHA-256(salt + nonce) starts with `difficulty` zero BITS (the auth-service
 * contract). `public/workers/pow-solver.js` runs the same loop off the main
 * thread; this module is its client and its fallback for a browser where the
 * worker cannot start. Keep the two loops identical.
 */

/** Leading zero bits of a digest. */
export function countLeadingZeroBits(bytes: Uint8Array): number {
  let bits = 0;
  for (const byte of bytes) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    return bits + Math.clz32(byte) - 24;
  }
  return bits;
}

/**
 * Main-thread solve, in rounds of `batchSize` concurrent digests so every round
 * awaits (the page stays responsive). Returns the first passing nonce in order,
 * or `null` after `maxAttempts`.
 */
export async function solveProofOfWork(
  salt: string,
  difficulty: number,
  maxAttempts: number = POW_MAX_ATTEMPTS,
  batchSize: number = POW_BATCH_SIZE,
): Promise<string | null> {
  const encoder = new TextEncoder();
  for (let start = 0; start < maxAttempts; start += batchSize) {
    const end = Math.min(start + batchSize, maxAttempts);
    const jobs: Promise<ArrayBuffer>[] = [];
    for (let nonce = start; nonce < end; nonce += 1) {
      jobs.push(crypto.subtle.digest('SHA-256', encoder.encode(`${salt}${nonce}`)));
    }
    const digests = await Promise.all(jobs);
    const index = digests.findIndex(
      (digest) => countLeadingZeroBits(new Uint8Array(digest)) >= difficulty,
    );
    if (index !== -1) {
      return String(start + index);
    }
  }
  return null;
}

function solveInWorker(request: PowWorkerRequest): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(POW_WORKER_URL);
    } catch {
      resolve(solveProofOfWork(request.salt, request.difficulty));
      return;
    }
    worker.addEventListener('message', (event: MessageEvent<PowWorkerResponse>) => {
      worker.terminate();
      resolve(typeof event.data.nonce === 'string' ? event.data.nonce : null);
    });
    // A worker blocked by policy or missing from the deploy: solve here instead.
    worker.addEventListener('error', () => {
      worker.terminate();
      resolve(solveProofOfWork(request.salt, request.difficulty));
    });
    worker.postMessage(request);
  });
}

/** Solve a challenge in a Web Worker when the browser has one, else on the main thread. */
export function solveChallenge(challenge: PowChallenge): Promise<string | null> {
  if (typeof Worker === 'undefined') {
    return solveProofOfWork(challenge.salt, challenge.difficulty);
  }
  return solveInWorker({
    salt: challenge.salt,
    difficulty: challenge.difficulty,
    maxAttempts: POW_MAX_ATTEMPTS,
    batchSize: POW_BATCH_SIZE,
  });
}
