'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  INBOX_PROVIDER_FILTER_OPTIONS,
  INBOX_TYPE_FILTER_OPTIONS,
} from '@/constants/inbox.constants';
import type { WorkspaceObjectType } from '@/enums/workspace-object-type.enum';
import type { WorkspaceProvider } from '@/enums/workspace-provider.enum';
import type { InboxFilterBarProps } from '@/types/workspace-inbox.types';

export function InboxFilterBar({ filter, onChange, t }: InboxFilterBarProps): ReactElement {
  const toggleProvider = (provider: WorkspaceProvider): void => {
    const next = filter.providers.includes(provider)
      ? filter.providers.filter((p) => p !== provider)
      : [...filter.providers, provider];
    onChange({ ...filter, providers: next });
  };

  const toggleType = (type: WorkspaceObjectType): void => {
    const next = filter.types.includes(type)
      ? filter.types.filter((p) => p !== type)
      : [...filter.types, type];
    onChange({ ...filter, types: next });
  };

  const reset = (): void => {
    onChange({ providers: [], types: [], needsAttention: false, hasSuggestion: false });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {t('inbox.filter.providers')}
        </span>
        {INBOX_PROVIDER_FILTER_OPTIONS.map((provider) => {
          const active = filter.providers.includes(provider);
          return (
            <Button
              key={provider}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => toggleProvider(provider)}
            >
              {provider}
            </Button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{t('inbox.filter.types')}</span>
        {INBOX_TYPE_FILTER_OPTIONS.map((type) => {
          const active = filter.types.includes(type);
          return (
            <Button
              key={type}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => toggleType(type)}
            >
              {type}
            </Button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={filter.needsAttention}
            onCheckedChange={(checked) => onChange({ ...filter, needsAttention: checked })}
            aria-label={t('inbox.filter.needsAttention')}
          />
          {t('inbox.filter.needsAttention')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={filter.hasSuggestion}
            onCheckedChange={(checked) => onChange({ ...filter, hasSuggestion: checked })}
            aria-label={t('inbox.filter.hasSuggestion')}
          />
          {t('inbox.filter.hasSuggestion')}
        </label>
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          {t('inbox.filter.reset')}
        </Button>
      </div>
    </div>
  );
}
