import { createHash } from 'node:crypto';
import type { ThreadGenerationProgress } from '@claw/shared-types';

import { PROGRESS_STREAM_TERMINAL_STATUSES } from '../constants/generation-progress-stream.constants';
import type { GenerationProgressSnapshot } from '../types/generation-progress-stream.types';

/**
 * The event id is a hash of the snapshot itself, so every replica names the same content the
 * same way and a reconnect's `Last-Event-ID` can be compared with whatever the new replica reads.
 */
export function toProgressSnapshot(progress: ThreadGenerationProgress): GenerationProgressSnapshot {
  const id = createHash('sha1').update(JSON.stringify(progress)).digest('hex').slice(0, 16);
  return { id, progress };
}

export function isTerminalProgress(progress: ThreadGenerationProgress): boolean {
  return PROGRESS_STREAM_TERMINAL_STATUSES.includes(progress.status);
}

/** The `Last-Event-ID` header as a bounded plain string, or undefined. */
export function parseLastEventId(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value !== undefined && /^[a-f0-9]{16}$/.test(value) ? value : undefined;
}
