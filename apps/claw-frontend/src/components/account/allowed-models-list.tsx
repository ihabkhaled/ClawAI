'use client';

import type { ReactElement } from 'react';

import type { AllowedModelsListProps } from '@/types';

export function AllowedModelsList({ models, t }: AllowedModelsListProps): ReactElement {
  if (models.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('userPlan.allModelsAllowed')}</p>;
  }

  return (
    <ul className="grid gap-2">
      {models.map((model) => (
        <li
          key={`${model.provider}/${model.model}`}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-sm"
        >
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{model.provider}</code>
          <span className="font-medium">{model.model}</span>
          {model.allowAsPrimary ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {t('userPlan.modelPrimary')}
            </span>
          ) : null}
          {model.allowInCompare ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {t('userPlan.modelCompare')}
            </span>
          ) : null}
          {model.dailyTokenLimitOverride !== null ? (
            <span className="ml-auto text-xs text-muted-foreground">
              {t('userPlan.modelOverride', {
                limit: model.dailyTokenLimitOverride.toLocaleString(),
              })}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
