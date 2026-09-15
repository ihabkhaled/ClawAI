import { BillingErrorCode, QuotaWindow } from '@claw/shared-types';

// Which refusal a blocked window is reported as. The frontend maps each of
// these to its own transcript card, so reporting a monthly block as a daily one
// tells the user to come back tomorrow when they must wait weeks.
export const QUOTA_WINDOW_ERROR_CODE: Readonly<Record<QuotaWindow, BillingErrorCode>> = {
  [QuotaWindow.DAY]: BillingErrorCode.QUOTA_DAILY_EXCEEDED,
  [QuotaWindow.WEEK]: BillingErrorCode.QUOTA_WEEKLY_EXCEEDED,
  [QuotaWindow.MONTH]: BillingErrorCode.QUOTA_MONTHLY_EXCEEDED,
  [QuotaWindow.BILLING_PERIOD]: BillingErrorCode.QUOTA_MONTHLY_EXCEEDED,
};

// The sentence each window's refusal carries before i18n resolves the code.
export const QUOTA_WINDOW_MESSAGE: Readonly<Record<QuotaWindow, string>> = {
  [QuotaWindow.DAY]: 'Daily token quota exceeded',
  [QuotaWindow.WEEK]: 'Weekly token quota exceeded',
  [QuotaWindow.MONTH]: 'Monthly token quota exceeded',
  [QuotaWindow.BILLING_PERIOD]: 'Monthly token quota exceeded',
};
