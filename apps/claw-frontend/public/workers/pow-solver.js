/*
 * Sign-up / sign-in proof of work (security incident 2026-11-27). Served
 * same-origin from /workers/ and started by src/lib/bot-check/pow-solver.ts
 * with `new Worker('/workers/pow-solver.js')`. Plain JS: it is not bundled, so
 * no page carries it until a form needs it (rules/47).
 *
 * Finds the first decimal nonce such that SHA-256(salt + nonce) starts with
 * `difficulty` zero bits, hashing `batchSize` candidates concurrently per
 * round, and gives up (nonce: null) after `maxAttempts`. The same loop lives in
 * solveProofOfWork() in pow-solver.ts; keep the two identical.
 */
function countLeadingZeroBits(bytes) {
  let bits = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    if (byte === 0) {
      bits += 8;
      continue;
    }
    return bits + Math.clz32(byte) - 24;
  }
  return bits;
}

async function solve(salt, difficulty, maxAttempts, batchSize) {
  const encoder = new TextEncoder();
  for (let start = 0; start < maxAttempts; start += batchSize) {
    const end = Math.min(start + batchSize, maxAttempts);
    const jobs = [];
    for (let nonce = start; nonce < end; nonce += 1) {
      jobs.push(crypto.subtle.digest('SHA-256', encoder.encode(salt + String(nonce))));
    }
    const digests = await Promise.all(jobs);
    for (let index = 0; index < digests.length; index += 1) {
      if (countLeadingZeroBits(new Uint8Array(digests[index])) >= difficulty) {
        return { nonce: String(start + index), attempts: start + index + 1 };
      }
    }
  }
  return { nonce: null, attempts: maxAttempts };
}

self.addEventListener('message', (event) => {
  const { salt, difficulty, maxAttempts, batchSize } = event.data;
  solve(String(salt), Number(difficulty), Number(maxAttempts), Number(batchSize)).then(
    (result) => self.postMessage(result),
    () => self.postMessage({ nonce: null, attempts: 0 }),
  );
});
