import type { FileLimitNoticeData } from '@/types';

/**
 * The plan's AI-file refusal on an assistant message, or null (ADR-110).
 * chat-service stores `{ type: 'file_limit', fileLimit: { used, limit } }`
 * instead of a file when the day's allowance is used.
 */
export function readFileLimit(
  metadata: Record<string, unknown> | null,
): FileLimitNoticeData | null {
  if (metadata?.['type'] !== 'file_limit') {
    return null;
  }
  const value = metadata['fileLimit'];
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const used = 'used' in value ? value.used : undefined;
  const limit = 'limit' in value ? value.limit : undefined;
  return typeof used === 'number' && typeof limit === 'number' ? { used, limit } : null;
}
