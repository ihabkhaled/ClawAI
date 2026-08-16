import {
  ROUTER_TRACE_EVENT_PATTERNS,
  ROUTER_TRACE_STAGE_ID_PREFIX,
  ROUTER_TRACE_TERMINAL_STAGE_ID,
} from '@claw/shared-constants';

import type { RouterTraceLabelKey, RouterTraceReasonKey } from '@/types/router-trace-label.types';

/**
 * Stage id of the one router-trace phase whose description carries a decline
 * reason code rather than a display name — the only stage description that
 * needs translating via {@link ROUTER_TRACE_REASON_KEYS}.
 */
export const ROUTER_TRACE_DECISION_FAILED_STAGE_ID = `${ROUTER_TRACE_STAGE_ID_PREFIX}${ROUTER_TRACE_EVENT_PATTERNS.DECISION_FAILED}`;

/**
 * Resolves a chat progress-stage id to the `routerTrace.*` translation key
 * that names it, for every phase a user is shown (routing-service also emits
 * candidate-level events that never reach the client at all — see
 * chat-service's `ROUTER_TRACE_STAGE_LABELS` allowlist).
 *
 * Keyed by the full stage id — `${ROUTER_TRACE_STAGE_ID_PREFIX}${pattern}` —
 * rather than the bare event pattern, because that is the field actually
 * carried on `VisibleProgressStage.id`.
 */
export const ROUTER_TRACE_LABEL_KEYS: Readonly<Record<string, RouterTraceLabelKey>> = Object.freeze(
  {
    [`${ROUTER_TRACE_STAGE_ID_PREFIX}${ROUTER_TRACE_EVENT_PATTERNS.REQUESTED}`]: 'analyzing',
    [`${ROUTER_TRACE_STAGE_ID_PREFIX}${ROUTER_TRACE_EVENT_PATTERNS.REGISTRY_LOADED}`]:
      'loadingRegistry',
    [`${ROUTER_TRACE_STAGE_ID_PREFIX}${ROUTER_TRACE_EVENT_PATTERNS.POLICY_FILTER_COMPLETED}`]:
      'applyingPolicy',
    [`${ROUTER_TRACE_STAGE_ID_PREFIX}${ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_ATTEMPT_STARTED}`]:
      'consultingRouter',
    [`${ROUTER_TRACE_STAGE_ID_PREFIX}${ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_ATTEMPT_FAILED}`]:
      'attemptFailed',
    [`${ROUTER_TRACE_STAGE_ID_PREFIX}${ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_FALLBACK_SELECTED}`]:
      'fallingBack',
    [`${ROUTER_TRACE_STAGE_ID_PREFIX}${ROUTER_TRACE_EVENT_PATTERNS.LOW_CONFIDENCE}`]:
      'lowConfidence',
    [`${ROUTER_TRACE_STAGE_ID_PREFIX}${ROUTER_TRACE_EVENT_PATTERNS.DECISION_COMPLETED}`]:
      'modelSelected',
    [`${ROUTER_TRACE_STAGE_ID_PREFIX}${ROUTER_TRACE_EVENT_PATTERNS.DECISION_FAILED}`]:
      'routingFailed',
    // The terminal frame chat-service emits once a decision lands. It shares this
    // stage id with the legacy `emitRouterStarted` "Routing request" frame on
    // purpose, so this event resolves that row instead of adding a second one.
    [ROUTER_TRACE_TERMINAL_STAGE_ID]: 'modelSelected',
  },
);

/**
 * Resolves the stable decline-reason code routing-service emits on
 * `router.decision.failed` to the `routerTrace.unavailable.*` key that
 * explains it.
 *
 * These four codes are not carried in a shared package — `unavailableReason`
 * is a plain `string` on the wire (packages/shared-types/router-trace.types.ts)
 * — so they are mirrored here from their canonical source,
 * apps/claw-routing-service/.../constants/router-chain.constants.ts. A drift
 * between the two degrades to showing the raw code instead of a translated
 * sentence (see `resolveRouterTraceReason`), never a crash or a wrong label.
 */
export const ROUTER_TRACE_REASON_KEYS: Readonly<Record<string, RouterTraceReasonKey>> =
  Object.freeze({
    NO_PUBLISHED_CONFIGURATION: 'noConfiguration',
    CONFIGURATION_DISABLED: 'disabled',
    NO_RUNNABLE_CHAIN_ENTRY: 'noRunnableEntry',
    NO_ELIGIBLE_EXECUTION_MODEL: 'noEligibleModel',
  });
