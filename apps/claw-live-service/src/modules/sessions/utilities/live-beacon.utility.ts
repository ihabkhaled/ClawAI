import type { Request } from 'express';

import { LIVE_BEACON_MAX_BYTES } from '../constants/live-session.constants';

function tokenFrom(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{')) {
      try {
        return tokenFrom(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'object' && value !== null && 'token' in value) {
    const token = (value as { token: unknown }).token;
    return typeof token === 'string' && token.length > 0 ? token : null;
  }
  return null;
}

/** Reads the unparsed body (text/plain beacons skip the JSON parser), capped. */
function readRaw(request: Request): Promise<string> {
  return new Promise((resolve) => {
    if (request.readableEnded || !request.readable) {
      resolve('');
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > LIVE_BEACON_MAX_BYTES) {
        request.destroy();
        resolve('');
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    request.on('error', () => {
      resolve('');
    });
  });
}

/**
 * The close token of a navigator.sendBeacon request: a parsed JSON body
 * (`{ token }`), or a text/plain body holding the token or that JSON.
 */
export async function readBeaconToken(request: Request): Promise<string | null> {
  const parsed = tokenFrom(request.body);
  return parsed ?? tokenFrom(await readRaw(request));
}

/** Path of a stream's same-origin HLS proxy entry. */
export function playbackPath(prefix: string, streamId: string, suffix: string): string {
  return `${prefix}${encodeURIComponent(streamId)}${suffix}`;
}
