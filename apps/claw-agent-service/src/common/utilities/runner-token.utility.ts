import { createHash, randomBytes } from 'node:crypto';
import {
  RUNNER_TOKEN_BYTES,
  RUNNER_TOKEN_PREFIX,
  RUNNER_TOKEN_VISIBLE_CHARS,
} from '../../modules/agent/constants/runner.constants';
import type { IssuedRunnerToken } from '../../modules/agent/types/runner.types';

/**
 * F100 runner tokens. 256 random bits behind a recognisable prefix; only the
 * SHA-256 is stored. A plain digest is enough for a secret of this entropy:
 * there is nothing to brute-force, and a lookup by digest stays one index hit.
 */
export function issueRunnerToken(): IssuedRunnerToken {
  const token = `${RUNNER_TOKEN_PREFIX}${randomBytes(RUNNER_TOKEN_BYTES).toString('base64url')}`;
  return {
    token,
    tokenHash: hashRunnerToken(token),
    tokenPrefix: token.slice(0, RUNNER_TOKEN_PREFIX.length + RUNNER_TOKEN_VISIBLE_CHARS),
  };
}

export function hashRunnerToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function looksLikeRunnerToken(value: string): boolean {
  return value.startsWith(RUNNER_TOKEN_PREFIX) && value.length > RUNNER_TOKEN_PREFIX.length;
}
