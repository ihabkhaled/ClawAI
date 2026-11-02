import { CreditFallbackMode } from '@/enums';
import type { CreditFallbackModeOption } from '@/types/credit-fallback-mode.types';

/** Shown when nothing is saved (an older auth service omits the field). */
export const CREDIT_FALLBACK_MODE_DEFAULT = CreditFallbackMode.Fallback;

/** The id tying the card's visible label to the Select trigger (a11y). */
export const CREDIT_FALLBACK_MODE_SELECT_ID = 'settings-credit-fallback-mode';

export const CREDIT_FALLBACK_MODE_OPTIONS: readonly CreditFallbackModeOption[] = [
  { value: CreditFallbackMode.Fallback, labelKey: 'settings.creditFallbackModeFallback' },
  { value: CreditFallbackMode.Stop, labelKey: 'settings.creditFallbackModeStop' },
];
