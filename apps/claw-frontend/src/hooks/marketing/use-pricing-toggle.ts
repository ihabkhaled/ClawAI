'use client';

import { useCallback, useState } from 'react';

import type { UsePricingToggleReturn } from '@/types';

export function usePricingToggle(): UsePricingToggleReturn {
  const [isYearly, setIsYearly] = useState(false);

  const selectMonthly = useCallback((): void => {
    setIsYearly(false);
  }, []);

  const selectYearly = useCallback((): void => {
    setIsYearly(true);
  }, []);

  return { isYearly, selectMonthly, selectYearly };
}
