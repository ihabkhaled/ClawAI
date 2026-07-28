import { createHash, timingSafeEqual } from 'node:crypto';

import {
  VSCODE_CALLBACK_AUTHORITY,
  VSCODE_CALLBACK_SCHEMES,
} from '../constants/vscode-authorization.constants';

export function isAllowedVscodeCallback(value: string): boolean {
  const uri = new URL(value);
  return (
    VSCODE_CALLBACK_SCHEMES.has(uri.protocol) &&
    uri.hostname === VSCODE_CALLBACK_AUTHORITY &&
    uri.pathname === '/auth/callback' &&
    uri.username.length === 0 &&
    uri.password.length === 0 &&
    uri.search.length === 0 &&
    uri.hash.length === 0
  );
}

export function createPkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier, 'utf8').digest('base64url');
}

export function matchesPkceChallenge(verifier: string, expected: string): boolean {
  const actual = Buffer.from(createPkceChallenge(verifier), 'utf8');
  const target = Buffer.from(expected, 'utf8');
  return actual.length === target.length && timingSafeEqual(actual, target);
}
