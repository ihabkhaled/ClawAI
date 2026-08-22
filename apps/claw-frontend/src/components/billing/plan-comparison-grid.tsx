import type { ReactElement } from 'react';

import { BillingPlanCard } from '@/components/billing/billing-plan-card';
import type { PlanComparisonGridProps } from '@/types/billing-component.types';
import { isCurrentPlan } from '@/utilities/billing.utility';

export function PlanComparisonGrid({
  plans,
  subscription,
  interval,
  onSelect,
  pendingPlanId,
  t,
}: PlanComparisonGridProps): ReactElement {
  const ordered = [...plans].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {ordered.map((plan) => (
        <BillingPlanCard
          key={plan.id}
          plan={plan}
          interval={interval}
          isCurrent={isCurrentPlan(plan, subscription)}
          onSelect={onSelect}
          isPending={pendingPlanId === plan.id}
          t={t}
        />
      ))}
    </div>
  );
}
