import { Download } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActiveDownloadsPanelProps } from '@/types';

import { DownloadProgressBar } from './download-progress-bar';

export function ActiveDownloadsPanel({
  jobs,
  onCancel,
  isCancelPending,
  t,
}: ActiveDownloadsPanelProps) {
  const activeJobs = jobs.filter((j) => j.status === 'PENDING' || j.status === 'IN_PROGRESS');

  if (activeJobs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Download className="h-5 w-5" />
          {t('catalog.activeDownloads')} ({activeJobs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {activeJobs.map((job) => (
          <DownloadProgressBar
            key={job.id}
            job={job}
            onCancel={onCancel}
            isCancelPending={isCancelPending}
            t={t}
          />
        ))}
      </CardContent>
    </Card>
  );
}
