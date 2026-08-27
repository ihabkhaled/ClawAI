import { QuotaWindow } from '@claw/shared-types';

import type { QuotaWindowRung } from '../types/quota-window.types';

/**
 * The windows a plan caps, in ascending length, paired with their columns.
 *
 * Order is the contract, not presentation: the coherence check walks adjacent
 * rungs, so a window inserted in the wrong place would quietly stop comparing
 * what it exists to compare. `BILLING_PERIOD` is absent because no plan column
 * caps it.
 */
export const QUOTA_WINDOW_ORDER: readonly QuotaWindowRung[] = [
  { window: QuotaWindow.DAY, read: (quotas) => quotas.dailyTokenQuota },
  { window: QuotaWindow.WEEK, read: (quotas) => quotas.weeklyTokenQuota },
  { window: QuotaWindow.MONTH, read: (quotas) => quotas.monthlyTokenQuota },
];

/** Refusal code for a plan whose shorter window outruns its longer one. */
export const PLAN_QUOTA_WINDOWS_INCOHERENT = 'PLAN_QUOTA_WINDOWS_INCOHERENT';
