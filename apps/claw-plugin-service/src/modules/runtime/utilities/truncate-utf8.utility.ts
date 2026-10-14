import { UTF8_REPLACEMENT } from '../constants/runtime.constants';

/** Cuts `text` to at most `maxBytes` of UTF-8 without leaving half a character behind. */
export function truncateUtf8(text: string, maxBytes: number): { text: string; truncated: boolean } {
  const bytes = Buffer.from(text, 'utf8');
  if (bytes.length <= maxBytes) return { text, truncated: false };
  const cut = bytes.subarray(0, Math.max(maxBytes, 0)).toString('utf8');
  return {
    text: cut.endsWith(UTF8_REPLACEMENT) ? cut.slice(0, -1) : cut,
    truncated: true,
  };
}
