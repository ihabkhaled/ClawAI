'use client';

import type { ReactElement } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlanCardProps } from '@/types';

import { PlanFeatureGates } from './plan-feature-gates';

export function PlanCard({ plan, t }: PlanCardProps): ReactElement {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{plan.slug}</code>
        </div>
        <CardDescription>{t('userPlan.featuresIncluded')}</CardDescription>
      </CardHeader>
      <CardContent>
        <PlanFeatureGates featureGates={plan.featureGates} t={t} />
      </CardContent>
    </Card>
  );
}
