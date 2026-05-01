'use client';

import type { ReactElement } from 'react';

import { useLearnedPreferences } from '@/hooks/automation-preferences/use-learned-preferences';
import type { LearnedPreferencesPanelProps } from '@/types/automation-preference.types';

export function LearnedPreferencesPanel({ t }: LearnedPreferencesPanelProps): ReactElement {
  const { items, isLoading, isError } = useLearnedPreferences();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t('learned.panel.title')}</h2>
        <span className="text-xs text-muted-foreground">
          {t('learned.panel.subtitle', { count: String(items.length) })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{t('learned.panel.description')}</p>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">{t('learned.panel.loading')}</p>
      ) : null}
      {isError ? (
        <p className="text-xs text-destructive">{t('learned.panel.error')}</p>
      ) : null}
      {!isLoading && !isError && items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          {t('learned.panel.empty')}
        </p>
      ) : null}
      {items.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
            >
              <p>{item.content}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(item.updatedAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
