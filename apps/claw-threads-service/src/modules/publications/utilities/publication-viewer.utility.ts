import { createHmac } from 'node:crypto';

import { BOT_USER_AGENT_PATTERN } from '../constants/publication-view.constants';

/** True for crawlers, link previews and scripted clients, and for a missing user agent. */
export function isBotUserAgent(userAgent: string | undefined): boolean {
  return (
    userAgent === undefined || userAgent.trim() === '' || BOT_USER_AGENT_PATTERN.test(userAgent)
  );
}

function keyedHash(secret: string, purpose: string, value: string): string {
  return createHmac('sha256', secret).update(`${purpose}:${value}`).digest('hex');
}

/**
 * A visitor key for the dedupe window only: a keyed hash of address and browser,
 * so the raw address is never stored and the hash cannot be rebuilt without the key.
 */
export function hashAnonymousViewer(secret: string, ip: string, userAgent: string): string {
  return keyedHash(secret, 'viewer', `${ip}|${userAgent}`);
}

/** A stable signed-in reader key. Account deletion removes rows by this hash. */
export function hashReader(secret: string, userId: string): string {
  return keyedHash(secret, 'reader', userId);
}
