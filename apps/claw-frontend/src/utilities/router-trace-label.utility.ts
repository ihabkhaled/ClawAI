import {
  ROUTER_TRACE_DECISION_FAILED_STAGE_ID,
  ROUTER_TRACE_LABEL_KEYS,
  ROUTER_TRACE_REASON_KEYS,
} from '@/constants/router-trace-label.constants';
import type { TranslateFunction } from '@/types/i18n.types';

/**
 * Translates a router-trace progress stage's label into the viewer's locale.
 *
 * Returns `fallbackLabel` — the English string chat-service already put on
 * the wire — for any stage id this map does not recognise, which includes
 * every non-router stage (tool calls, research, the answer draft). Those are
 * a pre-existing, separately tracked gap; this function only ever narrows
 * what it changes to router-trace stages, never widens it.
 */
export function resolveRouterTraceLabel(
  stageId: string | undefined,
  t: TranslateFunction,
  fallbackLabel: string,
): string {
  if (!stageId) {
    return fallbackLabel;
  }

  const labelKey = ROUTER_TRACE_LABEL_KEYS[stageId];
  if (!labelKey) {
    return fallbackLabel;
  }

  return t(`routerTrace.${labelKey}`);
}

/**
 * Translates a routing decline reason code into the viewer's locale.
 *
 * `fallbackReason` is the raw code itself (e.g. `CONFIGURATION_DISABLED`) so
 * an unrecognised or future reason still shows something stable and
 * searchable rather than nothing.
 */
export function resolveRouterTraceReason(
  reasonCode: string | undefined,
  t: TranslateFunction,
  fallbackReason: string | undefined,
): string | undefined {
  if (!reasonCode) {
    return fallbackReason;
  }

  const reasonKey = ROUTER_TRACE_REASON_KEYS[reasonCode];
  if (!reasonKey) {
    return fallbackReason;
  }

  return t(`routerTrace.unavailable.${reasonKey}`);
}

/**
 * Translates a router-trace progress stage's description, when that stage is
 * the one whose description is a decline reason code rather than free text.
 *
 * Every other stage's description (a display name, a deployment id) is
 * already human-readable and is returned unchanged.
 */
export function resolveRouterTraceDescription(
  stageId: string | undefined,
  t: TranslateFunction,
  description: string | undefined,
): string | undefined {
  if (stageId !== ROUTER_TRACE_DECISION_FAILED_STAGE_ID) {
    return description;
  }

  return resolveRouterTraceReason(description, t, description);
}
