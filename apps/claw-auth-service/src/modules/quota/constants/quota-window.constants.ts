import { QuotaWindow } from '@claw/shared-types';

// The windows the legacy (non-weighted) token counter enforces, in the order
// the entitlements payload carries them. BILLING_PERIOD belongs to the
// weighted reservation path only.
export const LEGACY_QUOTA_WINDOWS: readonly QuotaWindow[] = [
  QuotaWindow.DAY,
  QuotaWindow.WEEK,
  QuotaWindow.MONTH,
];

// Everything except DAY — reserve() moves the day counter itself.
export const NON_DAY_QUOTA_WINDOWS: readonly QuotaWindow[] = [QuotaWindow.WEEK, QuotaWindow.MONTH];
