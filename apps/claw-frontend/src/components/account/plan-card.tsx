'use client';

import type { ReactElement } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrialStatus } from '@/enums/trial-status.enum';
import type { PlanCardProps } from '@/types';

import { PlanFeatureGates } from './plan-feature-gates';
import { PlanLimits } from './plan-limits';

export function PlanCard({ plan, trial, t }: PlanCardProps): ReactElement {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{plan.slug}</code>
        </div>
        <CardDescription>{t('userPlan.featuresIncluded')}</CardDescription>
        {trial.status === TrialStatus.HIDDEN ? null : (
          <p className="text-sm font-medium" data-testid="plan-trial-days">
            {trial.status === TrialStatus.ACTIVE
              ? t('userPlan.trialDaysLeft', { days: trial.daysRemaining })
              : t('userPlan.trialEnded')}
          </p>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4">
        <PlanFeatureGates featureGates={plan.featureGates} t={t} />
        <PlanLimits limits={plan.limits} t={t} />
      </CardContent>
    </Card>
  );
}
