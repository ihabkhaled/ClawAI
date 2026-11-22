import type { LiveStatusCode } from '../../../common/enums/live-status-code.enum';
import type { LiveStreamEventType } from '../../../common/enums/live-stream-event-type.enum';

/**
 * One event on a run's fan-out channel. Media times are epoch ms as numbers
 * (BigInt columns are converted at the edge). `language` is set only on
 * translation events, so a viewer receives the ones for their language.
 * Payload is kept under 8 KB (architecture doc section 9).
 */
export interface LiveStreamEvent {
  type: LiveStreamEventType;
  runId: string;
  /** Media time this event belongs to; the client reveals it once playback reaches it. */
  startAt: number;
  endAt?: number;
  language?: string;
  status?: LiveStatusCode;
  data: Record<string, unknown>;
}

/** What the run's worker publishes; the realtime module owns transport (Redis pub/sub + replay list). */
export interface LiveEventPublisher {
  publish(event: LiveStreamEvent): Promise<void>;
}
