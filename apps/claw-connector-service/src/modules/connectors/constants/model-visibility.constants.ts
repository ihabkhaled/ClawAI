import type { ModelVisibilityGateName } from '../types/connectors.types';

/** The order the chat picker applies its gates in; the diagnostic walks them the same way. */
export const MODEL_VISIBILITY_GATE_ORDER: readonly ModelVisibilityGateName[] = [
  'EXISTS',
  'CONNECTOR_ENABLED',
  'LIFECYCLE_ACTIVE',
  'EXPOSED',
  'KIND_CHAT',
  'IN_ROUTING_REGISTRY',
  'NOT_ROUTER_ONLY',
  'PRICED',
];

/** routing-service's internal visibility route (ServiceTokenGuard). */
export const ROUTING_MODEL_VISIBILITY_PATH = '/api/v1/internal/router-models/visibility';

/** An admin is waiting on the panel; a slow routing-service reads as UNKNOWN, not a hang. */
export const ROUTING_MODEL_VISIBILITY_TIMEOUT_MS = 3_000;

/** Gate detail when routing-service did not answer. */
export const ROUTING_UNKNOWN_DETAIL =
  'routing-service did not answer; check it is up and try again';

/** Reason recorded when a sync marks an exposed model REMOVED. */
export const SYNC_REMOVED_REASON = 'The provider no longer lists this model; marked REMOVED';

/** How many trail events the diagnostic returns, newest first. */
export const MODEL_VISIBILITY_EVENT_LIMIT = 10;
