import type { TwitchPlaybackToken } from '../types/server-pull.types';

/**
 * Reads `data.streamPlaybackAccessToken` from a Twitch GQL reply. Null when it is missing, not
 * JSON, or the token itself says playback is forbidden (geo-block, sub-only, banned channel):
 * that refusal is honoured, never worked around.
 */
export function parseTwitchPlaybackToken(text: string): TwitchPlaybackToken | null {
  const playback = readToken(parseJson(text));
  const inner = playback === null ? null : parseJson(playback.value);
  const forbidden =
    isRecord(inner) && isRecord(inner.authorization) && inner.authorization.forbidden === true;
  return forbidden ? null : playback;
}

function readToken(reply: unknown): TwitchPlaybackToken | null {
  if (!isRecord(reply) || !isRecord(reply.data)) return null;
  const token = reply.data.streamPlaybackAccessToken;
  if (!isRecord(token)) return null;
  const { value, signature } = token;
  return typeof value === 'string' &&
    typeof signature === 'string' &&
    value !== '' &&
    signature !== ''
    ? { value, signature }
    : null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
