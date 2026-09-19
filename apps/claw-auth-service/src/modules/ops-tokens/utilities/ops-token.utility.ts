import { createHash, randomBytes } from 'node:crypto';

import { OpsTokenScope } from '../../../common/enums';
import { type OpsAccessToken } from '../../../generated/prisma';
import {
  OPS_TOKEN_DISPLAY_PREFIX_LENGTH,
  OPS_TOKEN_PREFIX,
  OPS_TOKEN_RANDOM_BYTES,
} from '../constants/ops-token.constants';
import type { OpsTokenView } from '../types/ops-token.types';

/** A new token: prefix + 256 random bits, base64url. */
export function generateOpsToken(): string {
  return `${OPS_TOKEN_PREFIX}${randomBytes(OPS_TOKEN_RANDOM_BYTES).toString('base64url')}`;
}

/**
 * SHA-256 of the token. A fast hash is right here, unlike for passwords: the
 * token is 256 random bits, so there is nothing to brute-force, and verify
 * runs on every ops request.
 */
export function hashOpsToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function displayPrefix(token: string): string {
  return token.slice(0, OPS_TOKEN_DISPLAY_PREFIX_LENGTH);
}

export function isOpsTokenActive(row: OpsAccessToken, now: Date): boolean {
  return row.revokedAt === null && row.expiresAt.getTime() > now.getTime();
}

export function toOpsTokenView(row: OpsAccessToken, now: Date): OpsTokenView {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.tokenPrefix,
    scopes: row.scopes.filter((scope): scope is OpsTokenScope =>
      (Object.values(OpsTokenScope) as string[]).includes(scope),
    ),
    createdByUserId: row.createdByUserId,
    expiresAt: row.expiresAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    useCount: row.useCount,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    active: isOpsTokenActive(row, now),
  };
}
