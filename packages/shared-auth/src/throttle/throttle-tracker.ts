import { createHash, timingSafeEqual } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';
import { verifyUserAccessToken } from '@claw/shared-utilities';

import { resolveClientAddress } from './client-address.utility';
import {
  THROTTLE_BEARER_AUTH_SCHEME,
  THROTTLE_MAX_AUTHORIZATION_LENGTH,
  THROTTLE_SERVICE_AUTH_SCHEME,
  THROTTLE_TRACKER_CLIENT_PREFIX,
  THROTTLE_TRACKER_PEER_PREFIX,
  THROTTLE_TRACKER_UNKNOWN,
  THROTTLE_TRACKER_USER_PREFIX,
} from './throttle-tracker.constants';
import type {
  ClawThrottlerOptions,
  ThrottleRequestView,
  ThrottleWindow,
} from './throttle-tracker.types';

/**
 * Options for `ThrottlerModule.forRoot` that every service shares.
 *
 * Without them the throttler keys on `req.ip`, which behind nginx is nginx's
 * docker address, so every visitor on earth drew from one budget.
 */
export function buildThrottlerOptions(window: ThrottleWindow): ClawThrottlerOptions {
  return {
    throttlers: [window],
    getTracker: resolveThrottleTracker,
    skipIf: isInterServiceContext,
  };
}

/**
 * Who a request is counted against:
 *  1. a valid user access token → that user, wherever they connect from;
 *  2. otherwise the X-Real-IP nginx wrote, when the peer IS nginx (or a
 *     configured trusted proxy) — see `resolveClientAddress`;
 *  3. otherwise the socket peer itself (a docker-network caller, a LAN client
 *     on a published port, or a direct hit from the internet).
 * X-Forwarded-For is never read: its left-most entry is client-controlled.
 */
export async function resolveThrottleTracker(request: Record<string, unknown>): Promise<string> {
  const view = toRequestView(request);
  const userId = resolveUserId(view.headers);
  if (userId !== null) {
    return `${THROTTLE_TRACKER_USER_PREFIX}${userId}`;
  }
  const client = await resolveClientAddress(view.headers, view.socketAddress ?? view.ip);
  if (client === null) {
    return THROTTLE_TRACKER_UNKNOWN;
  }
  return client.viaProxy
    ? `${THROTTLE_TRACKER_CLIENT_PREFIX}${client.address}`
    : `${THROTTLE_TRACKER_PEER_PREFIX}${client.address}`;
}

/** True when the request carries the exact inter-service token. */
export function isInterServiceContext(context: ExecutionContext): boolean {
  if (context.getType() !== 'http') {
    return false;
  }
  const request: unknown = context.switchToHttp().getRequest();
  return isInterServiceRequest(isRecord(request) ? toRequestView(request).headers : {});
}

export function isInterServiceRequest(
  headers: Record<string, string | string[] | undefined>,
): boolean {
  const expected = process.env['INTER_SERVICE_AUTH_TOKEN'] ?? '';
  const authorization = readHeader(headers, 'authorization') ?? '';
  return (
    expected !== '' &&
    authorization.length <= THROTTLE_MAX_AUTHORIZATION_LENGTH &&
    authorization.startsWith(THROTTLE_SERVICE_AUTH_SCHEME) &&
    digestEquals(authorization.slice(THROTTLE_SERVICE_AUTH_SCHEME.length), expected)
  );
}

function resolveUserId(headers: Record<string, string | string[] | undefined>): string | null {
  const authorization = readHeader(headers, 'authorization');
  const secret = process.env['JWT_SECRET'] ?? '';
  if (
    authorization === undefined ||
    secret === '' ||
    authorization.length > THROTTLE_MAX_AUTHORIZATION_LENGTH ||
    !authorization.startsWith(THROTTLE_BEARER_AUTH_SCHEME)
  ) {
    return null;
  }
  try {
    return verifyUserAccessToken(authorization.slice(THROTTLE_BEARER_AUTH_SCHEME.length), secret)
      .sub;
  } catch {
    // An expired or forged token is counted by address, like any anonymous call.
    return null;
  }
}

function digestEquals(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left, 'utf8').digest();
  const rightDigest = createHash('sha256').update(right, 'utf8').digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const raw = new Map(Object.entries(headers)).get(name);
  return Array.isArray(raw) ? raw[0] : raw;
}

function toRequestView(request: Record<string, unknown>): ThrottleRequestView {
  const headers = isRecord(request['headers']) ? request['headers'] : {};
  const socket = request['socket'];
  const socketAddress = isRecord(socket) ? socket['remoteAddress'] : undefined;
  const ip = request['ip'];
  return {
    headers: toHeaderMap(headers),
    ip: typeof ip === 'string' ? ip : undefined,
    socketAddress: typeof socketAddress === 'string' ? socketAddress : undefined,
  };
}

function toHeaderMap(
  headers: Record<string, unknown>,
): Record<string, string | string[] | undefined> {
  const map: Record<string, string | string[] | undefined> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (typeof value === 'string' || isStringArray(value)) {
      map[name.toLowerCase()] = value;
    }
  }
  return map;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
