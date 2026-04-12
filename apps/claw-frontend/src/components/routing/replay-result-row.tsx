import { ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { ReplayResultRowProps } from '@/types';

export function ReplayResultRow({ result, index, t }: ReplayResultRowProps): React.ReactElement {
  const oldRoute = `${result.originalDecision.selectedProvider} / ${result.originalDecision.selectedModel}`;
  const newRoute = `${result.replayDecision.selectedProvider} / ${result.replayDecision.selectedModel}`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>

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

        <Badge variant={result.changed ? 'default' : 'secondary'}>
          {result.changed ? t('replay.changed') : t('replay.unchanged')}
        </Badge>

        <span className="text-sm tabular-nums">
          {t('replay.improvement')}: {result.improvementScore > 0 ? '+' : ''}
          {result.improvementScore.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
