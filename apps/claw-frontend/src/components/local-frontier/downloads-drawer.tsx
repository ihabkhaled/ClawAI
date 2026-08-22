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
      className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4 shadow-sm"
      aria-label={labels.title}
    >
      <header className="flex items-center gap-2">
        <CloudDownload className="text-muted-foreground size-4" aria-hidden />
        <h2 className="text-foreground text-sm font-semibold">{labels.title}</h2>
        <span className="border-border bg-muted touch:text-xs text-muted-foreground rounded-full border px-2 py-0.5 text-[10px]">
          {views.length}
        </span>
      </header>

      {views.length === 0 ? (
        <p className="border-border bg-background/40 text-muted-foreground rounded-md border border-dashed p-3 text-xs">
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
