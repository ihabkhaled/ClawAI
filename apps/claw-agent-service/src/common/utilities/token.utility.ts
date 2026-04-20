import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export function generateRandomBase64Url(byteLength: number): string {
  return randomBytes(byteLength).toString('base64url');
}

export function generateJti(): string {
  return randomUUID();
}

export function hashToken(token: string, pepper: string): string {
  return createHash('sha256').update(`${token}:${pepper}`).digest('hex');
}

export function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}
