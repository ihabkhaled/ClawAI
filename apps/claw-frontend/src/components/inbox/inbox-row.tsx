'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { INBOX_VIEWABLE_OBJECT_TYPES } from '@/constants/inbox.constants';
import type { InboxRowProps } from '@/types/workspace-inbox.types';

export function InboxRow({
  item,
  onToggleNeedsAttention,
  onViewFile,
  isUpdating,
  t,
}: InboxRowProps): ReactElement {
  const isViewable = INBOX_VIEWABLE_OBJECT_TYPES.has(item.type);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
          {item.provider}
        </span>
        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
          {item.type}
        </span>
        {item.needsAttention ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">
            {t('inbox.row.needsAttention')}
          </span>
        ) : null}
        {item.hasSuggestion ? (
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-500">
            {t('inbox.row.hasSuggestion')}
          </span>
        ) : null}
        {item.externalUpdatedAt !== null ? (
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(item.externalUpdatedAt).toLocaleString()}
          </span>
        ) : null}
      </div>
      <h3 className="text-sm font-semibold">
        {item.url !== null ? (
          <a href={item.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h3>
      {item.contentSnippet !== null ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{item.contentSnippet}</p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={item.needsAttention ? 'outline' : 'default'}
          onClick={() => onToggleNeedsAttention(item.id, !item.needsAttention)}
          disabled={isUpdating}
        >
          {item.needsAttention ? t('inbox.row.unmark') : t('inbox.row.mark')}
        </Button>
        {item.url !== null ? (
          <a href={item.url} target="_blank" rel="noreferrer">
            <Button type="button" size="sm" variant="ghost">
              {t('inbox.row.openExternal')}
            </Button>
          </a>
        ) : null}
        {isViewable ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onViewFile(item.id, item.title)}
          >
            {t('inbox.row.viewFile')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
