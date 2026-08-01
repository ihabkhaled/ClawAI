'use client';

import type { ReactElement } from 'react';

import type { PlanLimitsProps } from '@/types';
import { formatNullableLimit } from '@/utilities';

export function PlanLimits({ limits, t }: PlanLimitsProps): ReactElement {
  return (
    <div className="border-border grid gap-2 border-t pt-4">
      <p className="text-sm font-medium">{t('userPlan.planLimits')}</p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="bg-muted/35 flex justify-between gap-3 rounded-md px-3 py-2">
          <dt className="text-muted-foreground">{t('userPlan.dailyLimitLabel')}</dt>
          <dd className="font-medium tabular-nums">
            {formatNullableLimit(limits.dailyTokens, t('userUsage.unlimited'))}
          </dd>
        </div>
        <div className="bg-muted/35 flex justify-between gap-3 rounded-md px-3 py-2">
          <dt className="text-muted-foreground">{t('userPlan.weeklyLimitLabel')}</dt>
          <dd className="font-medium tabular-nums">
            {formatNullableLimit(limits.weeklyTokens, t('userUsage.unlimited'))}
          </dd>
        </div>
        <div className="bg-muted/35 flex justify-between gap-3 rounded-md px-3 py-2">
          <dt className="text-muted-foreground">{t('userPlan.monthlyLimitLabel')}</dt>
          <dd className="font-medium tabular-nums">
            {formatNullableLimit(limits.monthlyTokens, t('userUsage.unlimited'))}
          </dd>
        </div>
        <div className="bg-muted/35 flex justify-between gap-3 rounded-md px-3 py-2">
          <dt className="text-muted-foreground">{t('userPlan.chatsLimitLabel')}</dt>
          <dd className="font-medium tabular-nums">
            {formatNullableLimit(limits.chatsPerDay, t('userUsage.unlimited'))}
          </dd>
        </div>
      </dl>
    </div>
  );
}
