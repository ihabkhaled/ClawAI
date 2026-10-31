import type { ThreadGenerationProgress } from '@claw/shared-types';

import { ThreadProgressStreamMessageType } from '@/enums/thread-progress-stream.enum';
import type { ThreadProgressStreamMessage } from '@/types/thread-generation-progress.types';

const STREAM_MESSAGE_TYPES: readonly string[] = Object.values(ThreadProgressStreamMessageType);

/** The stream route of one publication, under the API base URL. */
export function threadProgressStreamUrl(baseUrl: string, publicationId: string): string {
  return `${baseUrl}/thread-publications/${encodeURIComponent(publicationId)}/generation-progress/stream`;
}

function isProgressShape(value: unknown): value is ThreadGenerationProgress {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<ThreadGenerationProgress>;
  return (
    typeof candidate.jobId === 'string' &&
    typeof candidate.status === 'string' &&
    Array.isArray(candidate.steps)
  );
}

/** Decodes one `data:` payload; anything that is not a known, well-formed message is dropped. */
export function parseThreadProgressStreamMessage(data: string): ThreadProgressStreamMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const { type } = parsed as { type?: unknown };
  if (typeof type !== 'string' || !STREAM_MESSAGE_TYPES.includes(type)) {
    return null;
  }
  if (type === ThreadProgressStreamMessageType.Progress) {
    const { progress } = parsed as { progress?: unknown };
    return isProgressShape(progress) ? { type, progress } : null;
  }
  if (type === ThreadProgressStreamMessageType.Error) {
    const { code } = parsed as { code?: unknown };
    return { type, code: typeof code === 'string' ? code : 'UNKNOWN' };
  }
  return { type } as ThreadProgressStreamMessage;
}

function lastSeq(progress: ThreadGenerationProgress): number {
  return progress.steps.at(-1)?.seq ?? 0;
}

/**
 * True when `incoming` is older than what the page already shows, so a late or replayed snapshot
 * (a poll that was in flight when a push landed, a reconnect's first frame) never rewinds the list.
 * Newer means a later `updatedAt`, or the same time with more steps.
 */
export function isStaleThreadProgress(
  current: ThreadGenerationProgress | undefined,
  incoming: ThreadGenerationProgress,
): boolean {
  if (current === undefined || current.jobId !== incoming.jobId) {
    return false;
  }
  const currentAt = Date.parse(current.updatedAt);
  const incomingAt = Date.parse(incoming.updatedAt);
  if (Number.isFinite(currentAt) && Number.isFinite(incomingAt) && incomingAt !== currentAt) {
    return incomingAt < currentAt;
  }
  return lastSeq(incoming) < lastSeq(current) || incoming.steps.length < current.steps.length;
}

/** True when a stream failure means retrying cannot help (not the owner, or the Thread is gone). */
export function isThreadProgressStreamRefusal(error: unknown): boolean {
  return error instanceof Error && /^SSE connection failed: (403|404)$/.test(error.message);
}
