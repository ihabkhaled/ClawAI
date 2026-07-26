import { useCallback, useState } from 'react';

import { BillingGateway, BillingInterval } from '@/enums/billing.enum';
import type { UseBillingViewStateReturn } from '@/types/billing-hook.types';
import type { BillingPlan } from '@/types/billing.types';

// Pure view state for the billing page: which interval is being compared, which
// plan the user is considering, and which gateway they picked. It holds no
// server state and performs no requests, so it stays trivially testable.
export function useBillingViewState(): UseBillingViewStateReturn {
  const [interval, setInterval] = useState<BillingInterval>(BillingInterval.MONTHLY);
  const [gateway, setGateway] = useState<BillingGateway>(BillingGateway.PAYPAL);
  const [targetPlan, setTargetPlan] = useState<BillingPlan | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const closePlanChange = useCallback(() => {
    setTargetPlan(null);
  }, []);

  return {
    interval,
    setInterval,
    gateway,
    setGateway,
    targetPlan,
    openPlanChange: setTargetPlan,
    closePlanChange,
    isCancelOpen,
    setIsCancelOpen,
  };
}
