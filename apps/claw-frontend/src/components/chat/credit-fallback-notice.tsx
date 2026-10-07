import { Coins } from 'lucide-react';
import type { ReactElement } from 'react';

import { CREDIT_FALLBACK_REASON_KEYS } from '@/constants/credit-fallback.constants';
import type { CreditFallbackNoticeProps } from '@/types';

/**
 * "Your connector credit is used up, so X answered instead. No credit was used."
 * Shown above an answer an included model wrote after a credit model was refused,
 * so a changed model is never silent and the user knows their credit was untouched.
 */
export function CreditFallbackNotice({
  info,
  answeredModel,
  t,
}: CreditFallbackNoticeProps): ReactElement {
  const params = { original: info.originalModel, answered: answeredModel };
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="credit-fallback-notice"
      className="border-warning/40 bg-warning-surface text-warning flex w-full items-start gap-2 rounded-md border px-3 py-2 text-xs"
    >
      <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-0.5 break-words">
        <span className="font-semibold">{t(CREDIT_FALLBACK_REASON_KEYS[info.reason], params)}</span>
        <span className="text-warning/90">{t('creditFallback.topUp', params)}</span>
      </div>
    </div>
  );
}
