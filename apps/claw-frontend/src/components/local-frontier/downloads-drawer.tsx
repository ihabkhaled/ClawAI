'use client';

import { CloudDownload } from 'lucide-react';

import type { DownloadsDrawerProps } from '@/types/local-frontier-ui.types';

import { DownloadJobRow } from './download-job-row';

export function DownloadsDrawer({
  views,
  onCancel,
  onRetry,
  labels,
}: DownloadsDrawerProps): React.ReactElement {
  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
      aria-label={labels.title}
    >
      <header className="flex items-center gap-2">
        <CloudDownload className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">{labels.title}</h2>
        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          {views.length}
        </span>
      </header>

      {views.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background/40 p-3 text-xs text-muted-foreground">
          {labels.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {views.map((view) => (
            <DownloadJobRow
              key={view.job.id}
              view={view}
              onCancel={onCancel}
              onRetry={onRetry}
              labels={labels}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
