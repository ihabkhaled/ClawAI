import { History, TrendingDown, TrendingUp } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ReplayRunHistoryProps } from '@/types';

import { ReplayExportPanel } from './replay-export-panel';

export function ReplayRunHistory({
  runs,
  isLoading,
  compareRunId1,
  compareRunId2,
  onCompareRunId1Change,
  onCompareRunId2Change,
  compareResult,
  isCompareLoading,
  t,
}: ReplayRunHistoryProps): React.ReactElement {
  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  if (runs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title={t('replay.noRunsHistory')}
        description={t('replay.noRunsHistoryDesc')}
      />
    );
  }

  const runLabel = (id: string): string => {
    const run = runs.find((r) => r.id === id);
    return run ? (run.name ?? id.slice(0, 8)) : id.slice(0, 8);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t('replay.compareRunsTitle')}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('replay.compareRunsDesc')}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <p className="mb-1 text-xs text-muted-foreground">{t('replay.runA')}</p>
              <Select
                value={compareRunId1 ?? ''}
                onValueChange={(v) => onCompareRunId1Change(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('replay.selectRunToCompare')} />
                </SelectTrigger>
                <SelectContent>
                  {runs.map((run) => (
                    <SelectItem key={run.id} value={run.id} disabled={run.id === compareRunId2}>
                      {run.name ?? run.id.slice(0, 8)} —{' '}
                      {new Date(run.createdAt).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <p className="mb-1 text-xs text-muted-foreground">{t('replay.runB')}</p>
              <Select
                value={compareRunId2 ?? ''}
                onValueChange={(v) => onCompareRunId2Change(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('replay.selectRunToCompare')} />
                </SelectTrigger>
                <SelectContent>
                  {runs.map((run) => (
                    <SelectItem key={run.id} value={run.id} disabled={run.id === compareRunId1}>
                      {run.name ?? run.id.slice(0, 8)} —{' '}
                      {new Date(run.createdAt).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isCompareLoading ? (
            <p className="text-center text-xs text-muted-foreground">{t('common.loading')}</p>
          ) : null}

          {compareResult && !isCompareLoading ? (
            <div className="rounded-md border p-3">
              <div className="mb-2 flex items-center gap-2">
                {compareResult.improved ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm font-medium">
                  {compareResult.improved ? t('replay.improved') : t('replay.regressed')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {runLabel(compareResult.runA.id)} → {runLabel(compareResult.runB.id)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">{t('replay.totalReplayed')}</p>
                  <p className="font-medium">
                    {compareResult.delta.totalReplayed > 0 ? '+' : ''}
                    {compareResult.delta.totalReplayed}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('replay.changed')}</p>
                  <p className="font-medium">
                    {compareResult.delta.changedCount > 0 ? '+' : ''}
                    {compareResult.delta.changedCount}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('replay.suspicious')}</p>
                  <p
                    className={
                      compareResult.delta.suspiciousCount > 0
                        ? 'font-medium text-amber-600'
                        : 'font-medium'
                    }
                  >
                    {compareResult.delta.suspiciousCount > 0 ? '+' : ''}
                    {compareResult.delta.suspiciousCount}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('replay.avgImprovement')}</p>
                  <p
                    className={
                      compareResult.delta.avgImprovementDelta > 0
                        ? 'font-medium text-emerald-600'
                        : 'font-medium text-destructive'
                    }
                  >
                    {compareResult.delta.avgImprovementDelta > 0 ? '+' : ''}
                    {(compareResult.delta.avgImprovementDelta * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {runs.map((run) => (
          <Card key={run.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{run.name ?? run.id.slice(0, 8)}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>
                    {t('replay.totalReplayed')}: {run.totalReplayed}
                  </span>
                  <span className="text-amber-600">
                    {t('replay.changed')}: {run.changedCount}
                  </span>
                  <span className="text-destructive">
                    {t('replay.suspicious')}: {run.suspiciousCount}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {run.suspiciousCount > 0 ? (
                  <Badge variant="destructive">
                    {run.suspiciousCount} {t('replay.suspicious')}
                  </Badge>
                ) : null}
                <Badge variant="outline">
                  {(run.avgConfOld * 100).toFixed(0)}% → {(run.avgConfNew * 100).toFixed(0)}%
                </Badge>
                <ReplayExportPanel runId={run.id} t={t} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
