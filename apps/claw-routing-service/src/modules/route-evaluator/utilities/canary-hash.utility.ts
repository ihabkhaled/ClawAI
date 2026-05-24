// SCAFFOLD: stream R.1/R.3 (02-r1r3-v2-evaluator-canary)
// Pure stable bucketing — same input always yields same bucket.

import { createHash } from 'node:crypto';

import { CANARY_HASH_SALT } from '../constants/canary.constants';

export function hashToBucket(userId: string, orgId: string | undefined): number {
  const input = `${userId}|${orgId ?? ''}|${CANARY_HASH_SALT}`;
  const hex = createHash('sha256').update(input).digest('hex').slice(0, 8);
  return Number.parseInt(hex, 16) % 100;
}

export function isInCanaryBucket(
  userId: string,
  orgId: string | undefined,
  canaryPercent: number,
): boolean {
  if (canaryPercent <= 0) return false;
  if (canaryPercent >= 100) return true;
  return hashToBucket(userId, orgId) < canaryPercent;
}
