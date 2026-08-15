import type { StreamEvent } from './stream.types';

/** One router phase, ready to emit as a progress stage. */
export interface RouterTraceStage {
  stageId: string;
  label: string;
  description?: string;
  status: StreamEvent['status'];
  /** The trace's own ordering, preserved so replay renders correctly. */
  sequence: number;
}

/** The batch published by routing-service on router.trace.emitted. */
export interface RouterTraceEmittedPayload {
  traceId: string;
  requestId: string;
  threadId: string | null;
  events: unknown;
}
