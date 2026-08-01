import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_BEARER_TOKEN_LENGTH = 16_384;
const MAX_TOKEN_PEPPER_LENGTH = 4_096;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/u;

function assertTokenSecurityInput(value: string, maximumLength: number): void {
  if (value.length === 0 || value.length > maximumLength) {
    throw new RangeError('Token security input is outside the allowed bounds');
  }
}

export function hashBearerToken(token: string, pepper: string): string {
  assertTokenSecurityInput(token, MAX_BEARER_TOKEN_LENGTH);
  assertTokenSecurityInput(pepper, MAX_TOKEN_PEPPER_LENGTH);
  return createHmac('sha256', pepper).update(token, 'utf8').digest('hex');
}

export function constantTimeTokenHashEquals(left: string, right: string): boolean {
  if (!SHA256_HEX_PATTERN.test(left) || !SHA256_HEX_PATTERN.test(right)) {
    return false;
  }

  const leftBytes = Buffer.from(left, 'hex');
  const rightBytes = Buffer.from(right, 'hex');
  return timingSafeEqual(leftBytes, rightBytes);
}
