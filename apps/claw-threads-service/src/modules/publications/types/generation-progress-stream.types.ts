import type { ThreadGenerationProgress } from '@claw/shared-types';

/** One `data:` payload on the owner progress stream. `progress` is always a full snapshot. */
export type GenerationProgressStreamPayload =
  | { type: 'progress'; progress: ThreadGenerationProgress }
  | { type: 'terminal' }
  | { type: 'heartbeat' }
  | { type: 'reconnect' }
  | { type: 'gone' }
  | { type: 'error'; code: 'UPSTREAM_UNAVAILABLE' | 'TOO_MANY_STREAMS' };

/** A snapshot and the content id it is sent under. */
export type GenerationProgressSnapshot = { id: string; progress: ThreadGenerationProgress };

/** What a watcher tells a subscriber. */
export type GenerationProgressWatcherEvent =
  | { kind: 'snapshot'; snapshot: GenerationProgressSnapshot; terminal: boolean }
  | { kind: 'gone' }
  | { kind: 'error' };

/** Who is reading one stream and how it resumes. */
export type GenerationProgressStreamContext = {
  publicationId: string;
  ownerId: string;
  lastEventId: string | undefined;
  isBackedUp: () => boolean;
};
