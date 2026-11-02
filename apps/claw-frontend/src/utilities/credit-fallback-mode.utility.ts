import { CREDIT_FALLBACK_MODE_DEFAULT } from '@/constants/credit-fallback-mode.constants';
import { CreditFallbackMode } from '@/enums';

/** The saved mode, or the default when absent or unrecognised. */
export function parseCreditFallbackMode(value: string | null | undefined): CreditFallbackMode {
  return (
    Object.values(CreditFallbackMode).find((mode) => mode === value) ?? CREDIT_FALLBACK_MODE_DEFAULT
  );
}
