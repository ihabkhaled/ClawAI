import { Info } from 'lucide-react';
import type { ReactElement } from 'react';

import { PAYG_DUAL_CONSUMPTION_NOTICE_KEY } from '@/constants/credit.constants';
import { cn } from '@/lib/utils';
import type { CreditDualConsumptionNoticeProps } from '@/types/credit-component.types';

/**
 * THE disclaimer. One component, one key, six surfaces.
 *
 * `/pricing`, `/plan`, `/billing`, the model selector, the top-up dialog and the
 * 402 refusal body all render this. It takes no copy prop on purpose: a caller
 * that could pass its own string is exactly how thirteen locale files end up
 * carrying thirteen slightly different promises about what a cloud answer costs,
 * and a billing promise that differs by page is a promise nobody can keep.
 *
 * `role="note"` rather than `alert`: it is standing context, not an event, so it
 * must not interrupt a screen-reader user mid-sentence every time it mounts.
 */
export function CreditDualConsumptionNotice({
  t,
  className,
}: CreditDualConsumptionNoticeProps): ReactElement {
  return (
    <p
      role="note"
      data-testid="credit-dual-consumption-notice"
      className={cn(
        'text-muted-foreground border-border bg-muted/30 flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed',
        className,
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{t(PAYG_DUAL_CONSUMPTION_NOTICE_KEY)}</span>
    </p>
  );
}
