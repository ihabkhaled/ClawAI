import type { PlaylistRewriteResult } from '../types/hls-proxy.types';
import { hlsProxyPath } from './hls-proxy-url.utility';

function resolveUri(raw: string, base: URL): URL | null {
  try {
    return new URL(raw, base);
  } catch {
    return null;
  }
}

/**
 * Rewrites every URI line and every `URI="…"` attribute of an HLS playlist to the
 * same-origin proxy. A URI that resolves to another host than `allowedHost` (or to
 * another scheme) is counted in `rejected` and left out, so the proxy is never open.
 */
export function rewritePlaylist(
  text: string,
  playlistUrl: URL,
  streamId: string,
  allowedHost: string,
): PlaylistRewriteResult {
  let rejected = 0;
  const toProxy = (raw: string): string => {
    const resolved = resolveUri(raw.trim(), playlistUrl);
    const sameOrigin = resolved?.host === allowedHost && resolved.protocol === playlistUrl.protocol;
    if (!resolved || !sameOrigin) {
      rejected += 1;
      return '';
    }
    return hlsProxyPath(streamId, resolved.href);
  };
  const lines = text.split(/\r?\n/u).map((line) => {
    const trimmed = line.trim();
    if (trimmed === '') return line;
    return !trimmed.startsWith('#')
      ? toProxy(trimmed)
      : line.replaceAll(/URI="([^"]*)"/gu, (_match, uri: string) => `URI="${toProxy(uri)}"`);
  });
  return { text: lines.join('\n'), rejected };
}
