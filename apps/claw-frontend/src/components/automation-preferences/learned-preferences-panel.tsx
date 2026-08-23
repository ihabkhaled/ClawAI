'use client';

import type { ReactElement } from 'react';

import { useLearnedPreferences } from '@/hooks/automation-preferences/use-learned-preferences';
import type { LearnedPreferencesPanelProps } from '@/types/automation-preference.types';

export function LearnedPreferencesPanel({ t }: LearnedPreferencesPanelProps): ReactElement {
  const { items, isLoading, isError } = useLearnedPreferences();

  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t('learned.panel.title')}</h2>
        <span className="text-muted-foreground text-xs">
          {t('learned.panel.subtitle', { count: String(items.length) })}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">{t('learned.panel.description')}</p>
      {isLoading ? (
        <p className="text-muted-foreground text-xs">{t('learned.panel.loading')}</p>
      ) : null}
      {isError ? <p className="text-destructive text-xs">{t('learned.panel.error')}</p> : null}
      {!isLoading && !isError && items.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-md border border-dashed p-3 text-center text-xs">
          {t('learned.panel.empty')}
        </p>
      ) : null}
      {items.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-border bg-muted/20 rounded-md border px-3 py-2 text-xs"
            >
              <p>{item.content}</p>
              <p className="touch:text-xs text-muted-foreground mt-1 text-[10px]">
                {new Date(item.updatedAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
