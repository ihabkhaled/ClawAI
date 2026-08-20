'use client';

import { Check, X } from 'lucide-react';
import type { ReactElement } from 'react';

import { DISABLED_PLAN_FEATURE_GATES, PLAN_FEATURE_GATE_FIELDS } from '@/constants';
import type { PlanFeatureGatesProps } from '@/types';

export function PlanFeatureGates({ featureGates, t }: PlanFeatureGatesProps): ReactElement {
  return (
    <ul className="grid gap-2">
      {PLAN_FEATURE_GATE_FIELDS.map(({ field, labelKey }) => {
        const enabled = (featureGates ?? DISABLED_PLAN_FEATURE_GATES)[field];
        return (
          <li key={field} className="flex items-center gap-2 text-sm">
            {enabled ? (
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <X className="text-muted-foreground h-4 w-4" />
            )}
            <span className={enabled ? '' : 'text-muted-foreground line-through'}>
              {t(labelKey)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
