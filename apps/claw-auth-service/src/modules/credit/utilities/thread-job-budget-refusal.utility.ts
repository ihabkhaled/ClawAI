import { ForbiddenException } from '@nestjs/common';

import { type PlanFeatureKey } from '../../../generated/prisma';
import { type FeatureReservationRefusal } from '../../quota/types/quota.types';
import {
  THREAD_ALLOWANCE_UNAVAILABLE_CODE,
  THREAD_FEATURE_LABELS,
  THREAD_WINDOW_RENEWAL_FALLBACK_TEXT,
  THREAD_WINDOW_RENEWAL_TEXT,
} from '../constants/thread-job-budget.constants';

/**
 * The 403 for a Thread whose plan feature could not be reserved. A feature the plan switches off is
 * said so; an allowance that is used up OR held by a generation still running names how much is
 * used of how many, and when it frees up (the owner could not tell the two apart before).
 */
export function threadAllowanceRefusal(
  feature: PlanFeatureKey,
  decision: FeatureReservationRefusal,
): ForbiddenException {
  const label = THREAD_FEATURE_LABELS.get(feature) ?? feature;
  const message =
    decision.reason === 'FEATURE_DISABLED'
      ? `Your plan does not include ${label}, which Thread generation needs.`
      : `Your plan allows ${String(decision.limit)} Thread generation${decision.limit === 1 ? '' : 's'} with ${label}, and ${String(decision.used)} ${decision.used === 1 ? 'is' : 'are'} used or held by a generation that is still running. ${
          THREAD_WINDOW_RENEWAL_TEXT.get(decision.window ?? '') ??
          THREAD_WINDOW_RENEWAL_FALLBACK_TEXT
        }`;
  return new ForbiddenException({
    statusCode: 403,
    code: THREAD_ALLOWANCE_UNAVAILABLE_CODE,
    message,
    feature,
    reason: decision.reason,
    used: decision.used,
    limit: decision.limit,
    window: decision.window,
  });
}
