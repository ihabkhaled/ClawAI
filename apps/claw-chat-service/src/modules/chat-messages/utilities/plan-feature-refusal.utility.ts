import { HttpStatus } from '@nestjs/common';
import { type PlanFeature } from '@claw/shared-entitlements';

import {
  IMAGE_GENERATION_PLAN_REFUSAL_TEXT,
  PLAN_FEATURE_DISABLED_CODE,
} from '../constants/plan-feature-refusal.constants';
import type { LlmResponse } from '../types/execution.types';

/**
 * The reply a turn gets when the user's plan does not include the media
 * feature it needed (ADR-122): a finished assistant message carrying the
 * feature, so the chat renders a translated upgrade notice — never a raw
 * error, never a spinner that waits for a generation that was not started.
 */
export function imagePlanRefusalResponse(
  feature: PlanFeature,
  provider: string,
  model: string,
  startTime: number,
  usedFallback: boolean,
): LlmResponse {
  return {
    content: IMAGE_GENERATION_PLAN_REFUSAL_TEXT,
    provider,
    model,
    latencyMs: Date.now() - startTime,
    finishReason: 'stop',
    usedFallback,
    planFeatureRefusal: { feature },
  };
}

/**
 * True when a downstream service refused with the shared plan-feature 403.
 * image-service's exception filter sends the machine code as `code`.
 */
export function isPlanFeatureDisabledResponse(status: number, data: unknown): boolean {
  return status !== Number(HttpStatus.FORBIDDEN) || typeof data !== 'object' || data === null ? false : 'code' in data && data.code === PLAN_FEATURE_DISABLED_CODE;
}
