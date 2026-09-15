import { MIN_USEFUL_OUTPUT_TOKENS } from '../../../common/constants/quota-headroom.constants';
import { QuotaWindow } from '@claw/shared-types';
import type { QuotaEntitlement, QuotaHeadroom } from '../types/quota-headroom.types';

/**
 * How much of the daily allowance this request may actually spend.
 *
 * The old gate admitted anything while `remaining > 0` and reserved NOTHING,
 * then added the full measured cost afterwards. A user one token from their
 * limit could therefore send a request that wrote a 1,600-token essay and land
 * 1,655 over — the overrun was the entire cost of the last reply, unbounded.
 *
 * Two things fix that, and both are needed:
 *
 *   1. The PROMPT is counted BEFORE the call. It is the half that can be known
 *      exactly, so a user who cannot afford to even ask is refused rather than
 *      discovering it afterwards.
 *   2. The remainder becomes a hard `maxOutputTokens` ceiling, so the reply
 *      physically cannot spend more than is left.
 *
 * Below MIN_USEFUL_OUTPUT_TOKENS the request is refused instead of clamped: a
 * three-token stub is not an answer, and "you are out of tokens" is a better
 * outcome than a sentence that stops mid-
 *
 * All three windows are checked, not only the day. The TIGHTEST one wins: a
 * user with day headroom but no month headroom is refused on the month, and the
 * output ceiling is sized to the smallest remaining allowance so no window can
 * be overrun. `limit: null` means unlimited for that window and is skipped;
 * `0` means disabled and blocks. Entitlements from an older auth-service carry
 * no `windows` array — that falls back to the day figures rather than to "no
 * limits".
 */
export function resolveQuotaHeadroom(quota: QuotaEntitlement, promptTokens: number): QuotaHeadroom {
  if (quota.unlimited || quota.adminBypass) {
    return { allowed: true, maxOutputTokens: null };
  }
  const tightest = tightestWindow(quota);
  const remaining = tightest.limit - tightest.used;
  if (remaining <= 0) {
    return {
      allowed: false,
      maxOutputTokens: 0,
      remaining: 0,
      promptTokens,
      window: tightest.window,
    };
  }
  // The prompt is spent whether or not a single output token is produced.
  const afterPrompt = remaining - promptTokens;
  if (afterPrompt < MIN_USEFUL_OUTPUT_TOKENS) {
    return { allowed: false, maxOutputTokens: 0, remaining, promptTokens, window: tightest.window };
  }
  return {
    allowed: true,
    maxOutputTokens: afterPrompt,
    remaining,
    promptTokens,
    window: tightest.window,
  };
}

// The window with the least headroom left. Unlimited windows never win.
function tightestWindow(quota: QuotaEntitlement): {
  window: QuotaWindow;
  limit: number;
  used: number;
} {
  const day = { window: QuotaWindow.DAY, limit: quota.dailyLimit, used: quota.used };
  const enforced = (quota.windows ?? [])
    .filter((w): w is { window: QuotaWindow; limit: number; used: number } => w.limit !== null)
    .map((w) => ({ window: w.window, limit: w.limit, used: w.used }));
  const candidates = enforced.length > 0 ? enforced : [day];
  return candidates.reduce((tight, next) =>
    next.limit - next.used < tight.limit - tight.used ? next : tight,
  );
}
