import { Check } from 'lucide-react';
import type { ReactElement } from 'react';

import { PlanFeatureGates } from '@/components/account/plan-feature-gates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BillingInterval } from '@/enums/billing.enum';
import type { BillingPlanCardProps } from '@/types/billing-component.types';
import {
  computeYearlySavingMinor,
  findPlanPrice,
  formatMinorAmount,
  formatQuotaLimit,
} from '@/utilities/billing.utility';

export function BillingPlanCard({
  plan,
  interval,
  isCurrent,
  onSelect,
  isPending,
  t,
}: BillingPlanCardProps): ReactElement {
  const price = findPlanPrice(plan, interval);
  const savingMinor = interval === BillingInterval.YEARLY ? computeYearlySavingMinor(plan) : 0;
  const isNoCostPlan =
    plan.prices.length > 0 && plan.prices.every((planPrice) => planPrice.amountMinor === 0);

  return (
    <Card className={isCurrent ? 'border-primary' : undefined}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        {isCurrent ? <Badge>{t('billing.plans.current')}</Badge> : null}
      </CardHeader>
      <CardContent className="grid gap-4">
        {plan.description === null ? null : (
          <p className="text-muted-foreground text-sm">{plan.description}</p>
        )}

        {/* A plan with no price for the selected interval is shown as
            unavailable rather than free — a missing price is a catalog gap, and
            rendering it as "0" would advertise something we cannot sell. */}
        <p className="text-2xl font-semibold">
          {price === null
            ? t('billing.plans.unavailableForInterval')
            : formatMinorAmount(price.amountMinor, price.currency)}
        </p>

        {savingMinor > 0 && price !== null ? (
          <p className="text-muted-foreground text-xs">
            {t('billing.plans.yearlySaving', {
              amount: formatMinorAmount(savingMinor, price.currency),
            })}
          </p>
        ) : null}

        <ul className="grid gap-1 text-sm">
          <li className="flex items-center gap-2">
            <Check className="text-muted-foreground h-4 w-4" aria-hidden="true" />
            <span>
              {t('billing.plans.dailyTokens', { value: formatQuotaLimit(plan.dailyTokenQuota, t) })}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="text-muted-foreground h-4 w-4" aria-hidden="true" />
            <span>
              {t('adminPlans.form.weeklyTokenQuota')}: {formatQuotaLimit(plan.weeklyTokenQuota, t)}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="text-muted-foreground h-4 w-4" aria-hidden="true" />
            <span>
              {t('billing.plans.monthlyTokens', {
                value: formatQuotaLimit(plan.monthlyTokenQuota, t),
              })}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="text-muted-foreground h-4 w-4" aria-hidden="true" />
            <span>
              {t('billing.plans.chatsPerDay', { value: formatQuotaLimit(plan.maxChatsPerDay, t) })}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="text-muted-foreground h-4 w-4" aria-hidden="true" />
            <span>
              {t('adminPlans.form.maxMessagesPerDay')}:{' '}
              {formatQuotaLimit(plan.maxMessagesPerDay, t)}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="text-muted-foreground h-4 w-4" aria-hidden="true" />
            <span>
              {t('adminPlans.form.maxWorkspaceConnections')}:{' '}
              {formatQuotaLimit(plan.maxWorkspaceConnections, t)}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="text-muted-foreground h-4 w-4" aria-hidden="true" />
            <span>
              {t('adminPlans.form.maxContextPacks')}: {formatQuotaLimit(plan.maxContextPacks, t)}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="text-muted-foreground h-4 w-4" aria-hidden="true" />
            <span>
              {t('adminPlans.form.maxMemoryItems')}: {formatQuotaLimit(plan.maxMemoryItems, t)}
            </span>
          </li>
        </ul>

        <PlanFeatureGates featureGates={plan.featureGates} t={t} />

        {!isCurrent && !isNoCostPlan ? (
          <Button
            type="button"
            className="w-full"
            disabled={isPending || price === null}
            onClick={() => onSelect(plan)}
          >
            {t('billing.plans.selectCta')}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
