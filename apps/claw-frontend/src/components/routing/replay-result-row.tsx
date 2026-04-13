import { AlertTriangle, ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { ReplayResultRowProps } from '@/types';

import { ReplayOutcomeBadge } from './replay-outcome-badge';

export function ReplayResultRow({ result, index, t }: ReplayResultRowProps): React.ReactElement {
  const oldRoute = `${result.originalDecision.selectedProvider} / ${result.originalDecision.selectedModel}`;
  const newRoute = `${result.replayDecision.selectedProvider} / ${result.replayDecision.selectedModel}`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 shrink-0">
        <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
        {result.isSuspicious ? (
          <AlertTriangle className="ms-1 inline h-3.5 w-3.5 text-amber-500" />
        ) : null}
        {result.messagePreview ? (
          <p
            className="mt-1 max-w-[200px] truncate text-xs text-muted-foreground"
            title={result.messagePreview}
          >
            {result.messagePreview}
          </p>
        ) : null}
        {!result.hasOriginalContent ? (
          <p className="mt-0.5 text-xs text-amber-500">{t('replay.noOriginalContent')}</p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1 space-y-1">
          <p className="text-xs text-muted-foreground">{t('replay.oldRoute')}</p>
          <p className="text-sm font-medium">{oldRoute}</p>
        </div>

        <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />

        <div className="flex-1 space-y-1">
          <p className="text-xs text-muted-foreground">{t('replay.newRoute')}</p>
          <p className="text-sm font-medium">{newRoute}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {result.replayDecision.detectedCategory ? (
          <Badge variant="outline">{result.replayDecision.detectedCategory}</Badge>
        ) : null}

        <ReplayOutcomeBadge outcomeLabel={result.outcomeLabel} t={t} />

        <Badge variant={result.changed ? 'default' : 'secondary'}>
          {result.changed ? t('replay.changed') : t('replay.unchanged')}
        </Badge>

        <span className="text-sm tabular-nums">
          {result.improvementScore > 0 ? '+' : ''}
          {result.improvementScore.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
