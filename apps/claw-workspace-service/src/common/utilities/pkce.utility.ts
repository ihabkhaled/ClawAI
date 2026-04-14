import { createHash, randomBytes } from 'node:crypto';

import { PKCE_CODE_VERIFIER_BYTE_LENGTH } from '../constants/workspace.constants';

export function generateCodeVerifier(): string {
  return randomBytes(PKCE_CODE_VERIFIER_BYTE_LENGTH).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function generateOAuthState(): string {
  return randomBytes(16).toString('hex');
}
