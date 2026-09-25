/**
 * Reads a response body up to `maxBytes`, failing as soon as the limit is
 * crossed instead of buffering an arbitrarily large download first. Shared
 * by every strategy that reads a raw HTTP body (plain, TLS-impersonated).
 */
export async function readLimitedBody(
  body: ReadableStream<Uint8Array> | null | undefined,
  maxBytes: number,
): Promise<Buffer> {
  const reader = body?.getReader();
  if (reader === undefined) {
    return Buffer.alloc(0);
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Response exceeds max size (${String(maxBytes)} bytes)`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * Reads at most `maxBytes` and stops there, returning what it has — for a
 * format whose spec says content past the limit is simply ignored
 * (robots.txt, RFC 9309 §2.5), rather than an error.
 */
export async function readBodyPrefix(
  body: ReadableStream<Uint8Array> | null | undefined,
  maxBytes: number,
): Promise<Buffer> {
  const reader = body?.getReader();
  if (reader === undefined) {
    return Buffer.alloc(0);
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    total += value.length;
  }
  if (total >= maxBytes) {
    await reader.cancel();
  }
  return Buffer.concat(chunks).subarray(0, maxBytes);
}

/** `text/html; charset=utf-8` → `text/html`; null stays null. */
export function parseMimeType(header: string | null): string | null {
  if (header === null) {
    return null;
  }
  const semi = header.indexOf(';');
  return (semi >= 0 ? header.slice(0, semi) : header).trim().toLowerCase();
}
