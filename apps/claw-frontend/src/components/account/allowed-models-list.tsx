'use client';

import type { ReactElement } from 'react';

import type { AllowedModelsListProps } from '@/types';

export function AllowedModelsList({ models, t }: AllowedModelsListProps): ReactElement {
  if (models.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('userPlan.allModelsAllowed')}</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-2">
      {models.map((model) => (
        <li
          key={`${model.provider}/${model.model}`}
          className="border-border flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm"
        >
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{model.provider}</code>
          <span className="font-medium">{model.model}</span>
          {model.allowAsPrimary ? (
            <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
              {t('userPlan.modelPrimary')}
            </span>
          ) : null}
          {model.allowInCompare ? (
            <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
              {t('userPlan.modelCompare')}
            </span>
          ) : null}
          {model.dailyTokenLimitOverride !== null ? (
            <span className="text-muted-foreground ml-auto text-xs">
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
