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
