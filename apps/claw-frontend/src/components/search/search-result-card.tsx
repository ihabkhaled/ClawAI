'use client';

import type { ReactElement } from 'react';

import type { SearchResultCardProps } from '@/types/workspace-inbox.types';

export function SearchResultCard({ hit }: SearchResultCardProps): ReactElement {
  const scorePct = Math.max(0, Math.min(100, Math.round(hit.score * 100)));
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
          {hit.provider}
        </span>
        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
          {hit.objectType}
        </span>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <span>{scorePct}%</span>
          <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${String(scorePct)}%` }} />
          </div>
        </div>
      </div>
      {hit.title !== null ? (
        <h3 className="text-sm font-semibold">
          {hit.url !== null ? (
            <a href={hit.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              {hit.title}
            </a>
          ) : (
            hit.title
          )}
        </h3>
      ) : null}
      <p className="line-clamp-3 text-xs text-muted-foreground">{hit.contentSnippet}</p>
    </div>
  );
}
