import { useEffect, useState } from 'react';

import { ObservabilityPeriod } from '@/enums/observability-period.enum';
import type { ObservabilityPagesContextValue } from '@/types/observability-pages.types';

/**
 * The two custom-range dates are a DRAFT: typing a date never fires a query. Apply
 * writes both to the URL, and only when the range is valid. Re-seeded when the
 * URL changes underneath (Back button, a shared link).
 */
export function useCustomRangeDraft(scope: ObservabilityPagesContextValue) {
  const { state, setParams } = scope;
  const [from, setFrom] = useState(state.from);
  const [to, setTo] = useState(state.to);

  useEffect(() => {
    setFrom(state.from);
    setTo(state.to);
  }, [state.from, state.to]);

  const draftValid = from !== '' && to !== '' && from <= to;
  const apply = (): void => {
    if (draftValid) {
      setParams({ period: ObservabilityPeriod.Custom, from, to });
    }
  };

  return {
    from,
    to,
    setFrom,
    setTo,
    apply,
    draftValid,
    active: state.period === ObservabilityPeriod.Custom,
  };
}
