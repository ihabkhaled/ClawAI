'use client';

import { RunStatusIcon } from '@/components/discovery/run-status-icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RunsTimelineProps } from '@/types';
import { formatTimestamp } from '@/utilities/format.utility';

export function RunsTimeline({ runs, isLoading, t }: RunsTimelineProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t('discovery.runs.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <p className="text-xs text-muted-foreground">{t('common.loading')}</p> : null}
        {!isLoading && runs.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('discovery.runs.empty')}</p>
        ) : null}
        {!isLoading && runs.length > 0
          ? runs.map((run) => (
              <div key={run.id} className="flex items-start gap-3 text-sm">
                <RunStatusIcon status={run.status} />
                <div className="flex-1">
                  <p className="font-medium">
                    {run.source?.name ?? run.sourceId}
                    {run.isDryRun ? (
                      <span className="ml-2 text-xs text-muted-foreground">(dry run)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(run.startedAt)} • {run.discoveredCount}{' '}
                    {t('discovery.runs.discovered')} • {run.importedCount}{' '}
                    {t('discovery.runs.imported')} • {run.skippedCount}{' '}
                    {t('discovery.runs.skipped')}
                  </p>
                  {run.errorMessage !== null ? (
                    <p className="mt-1 text-xs text-destructive">{run.errorMessage}</p>
                  ) : null}
                </div>
              </div>
            ))
          : null}
      </CardContent>
    </Card>
  );
}
