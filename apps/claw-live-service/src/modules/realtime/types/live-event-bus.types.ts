import type { LiveStreamEvent } from './live-stream-event.types';

/** A published event as it travels on the channel and sits in the replay list. */
export type LiveEventEnvelope = LiveStreamEvent & {
  /** `<runId>:<seq>`, the SSE wire id a reconnect sends back as Last-Event-ID. */
  id: string;
  seq: number;
};

export type LiveEventListener = (event: LiveEventEnvelope) => void;

/** Removes a listener registered with RedisLiveEventBus.subscribe. */
export type LiveEventUnsubscribe = () => void;

export interface ParsedLastEventId {
  runId: string;
  seq: number;
}
