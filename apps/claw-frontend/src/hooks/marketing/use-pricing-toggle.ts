'use client';

import { useCallback, useState } from 'react';

import { BillingInterval } from '@/enums/billing.enum';
import type { UsePricingToggleReturn } from '@/types';

export function usePricingToggle(): UsePricingToggleReturn {
  const [interval, setInterval] = useState<BillingInterval>(BillingInterval.MONTHLY);

  const selectInterval = useCallback((next: BillingInterval): void => {
    setInterval(next);
  }, []);

  return { interval, selectInterval };
}
