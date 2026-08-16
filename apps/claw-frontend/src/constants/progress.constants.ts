import { StreamEventType } from '@/enums';

export const PROGRESS_EVENT_TYPES = new Set<StreamEventType>([
  StreamEventType.REQUEST_ACCEPTED,
  StreamEventType.ROUTER_STARTED,
  StreamEventType.ROUTER_COMPLETED,
  StreamEventType.TOOL_STARTED,
  StreamEventType.TOOL_COMPLETED,
  StreamEventType.RESEARCH_STARTED,
  StreamEventType.RESEARCH_COMPLETED,
  StreamEventType.PROVIDER_SELECTED,
  StreamEventType.MODEL_PROGRESS,
  StreamEventType.RESPONSE_STREAMING,
]);

// Bound on how many recent SSE `eventId`s useChatStream remembers for
// redelivery dedupe. A durable-journal replay/resume can redeliver a frame
// already processed; without a cap the seen-id set would grow unboundedly
// over a very long-lived stream.
export const PROCESSED_STREAM_EVENT_ID_CACHE_LIMIT = 500;
