import { type QuotaWindow } from '@claw/shared-types';

/**
 * The verdict on how much of the daily allowance a request may spend.
 *
 * `maxOutputTokens` is null ONLY for unlimited/admin, where no ceiling applies.
 * Otherwise it is a hard cap handed to the provider, so the reply cannot cost
 * more than the user has left.
 */
export type QuotaHeadroom = {
  allowed: boolean;
  maxOutputTokens: number | null;
  remaining?: number;
  promptTokens?: number;
  // Which window is the binding constraint — the one a refusal is reported as.
  window?: QuotaWindow;
};

// The quota slice of the entitlements payload this gate reads.
export type QuotaEntitlement = {
  dailyLimit: number;
  used: number;
  unlimited: boolean;
  adminBypass: boolean;
  windows?: { window: QuotaWindow; limit: number | null; used: number }[];
};
