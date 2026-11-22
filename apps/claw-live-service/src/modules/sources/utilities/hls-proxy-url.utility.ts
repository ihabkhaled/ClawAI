import { HLS_PROXY_PATH_PREFIX } from '../constants/sources.constants';

/** Same-origin proxy path for one absolute origin URL of a stream. */
export function hlsProxyPath(streamId: string, absoluteUrl: string): string {
  const encoded = Buffer.from(absoluteUrl, 'utf8').toString('base64url');
  return `${HLS_PROXY_PATH_PREFIX}${encodeURIComponent(streamId)}/hls/p?u=${encoded}`;
}

/** Decodes the `u` query value of a proxy path; null when it is not a URL. */
export function decodeHlsProxyTarget(encoded: string | undefined): URL | null {
  if (!encoded || !/^[A-Za-z0-9_-]+$/u.test(encoded)) return null;
  try {
    return new URL(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
