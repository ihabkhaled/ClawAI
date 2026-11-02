'use client';

import type { CreditFallbackModeState, UpdatePreferencesRequest } from '@/types';
import { logger } from '@/utilities';
import { parseCreditFallbackMode } from '@/utilities/credit-fallback-mode.utility';

/**
 * The "when a credit model is used up" setting: the saved mode as a Select value
 * and the change handler that saves it. Unknown values are ignored, not sent.
 */
export function useCreditFallbackMode(
  savedMode: string | null | undefined,
  updatePreferences: (data: UpdatePreferencesRequest) => void,
): CreditFallbackModeState {
  function handleCreditFallbackModeChange(value: string): void {
    const next = parseCreditFallbackMode(value);
    if (next !== value) {
      return;
    }
    logger.info({
      component: 'settings',
      action: 'change-credit-fallback-mode',
      message: 'User changing credit fallback mode',
      details: { creditFallbackMode: next },
    });
    updatePreferences({ creditFallbackMode: next });
  }

  return {
    currentCreditFallbackMode: parseCreditFallbackMode(savedMode),
    handleCreditFallbackModeChange,
  };
}
