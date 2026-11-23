import { PUBLIC_SECOND_LEVEL_LABEL } from '../constants/server-pull.constants';

/**
 * The host suffix a pulled stream's playlists and segments may come from: the resolved URL's
 * registrable domain (`manifest.googlevideo.com` → `googlevideo.com`). The SSRF guard still
 * refuses any private address under it.
 */
export function streamHostSuffix(url: URL): string {
  const labels = url.hostname.toLowerCase().split('.');
  const last = labels.at(-1) ?? '';
  const second = labels.at(-2) ?? '';
  const keep = last.length === 2 && PUBLIC_SECOND_LEVEL_LABEL.test(second) ? 3 : 2;
  return labels.slice(-keep).join('.');
}

/** Parses yt-dlp's `--print "%(protocol)s %(url)s"` line: an https HLS URL, else null. */
export function parseYtdlpStreamLine(output: string): URL | null {
  const line = output.trim().split('\n')[0] ?? '';
  const [protocol, raw] = line.split(' ', 2);
  if (protocol === undefined || raw === undefined || !protocol.startsWith('m3u8')) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
