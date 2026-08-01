import { createHash, timingSafeEqual } from 'node:crypto';

import {
  VSCODE_CALLBACK_AUTHORITY,
  VSCODE_CALLBACK_SCHEMES,
  VSCODE_LOOPBACK_CALLBACK_HOST,
  VSCODE_LOOPBACK_CALLBACK_PATH,
  VSCODE_LOOPBACK_MIN_PORT,
} from '../constants/vscode-authorization.constants';

export function isAllowedVscodeCallback(value: string): boolean {
  const uri = new URL(value);
  const hasSafeShape =
    uri.username.length === 0 &&
    uri.password.length === 0 &&
    uri.search.length === 0 &&
    uri.hash.length === 0 &&
    uri.pathname === VSCODE_LOOPBACK_CALLBACK_PATH;
  if (!hasSafeShape) {
    return false;
  }
  if (VSCODE_CALLBACK_SCHEMES.has(uri.protocol)) {
    return uri.hostname === VSCODE_CALLBACK_AUTHORITY && uri.port.length === 0;
  }
  const port = Number(uri.port);
  return (
    uri.protocol === 'http:' &&
    uri.hostname === VSCODE_LOOPBACK_CALLBACK_HOST &&
    Number.isInteger(port) &&
    port >= VSCODE_LOOPBACK_MIN_PORT &&
    port <= 65_535
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
