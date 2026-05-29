'use client';

import { Download } from 'lucide-react';

import { CompareResultCard } from '@/components/chat/compare-result-card';
import { Button } from '@/components/ui/button';
import { ParallelModelStatus } from '@/enums';
import { useParallelResultsGrid } from '@/hooks/chat/use-parallel-results-grid';
import type { ParallelResultsGridProps } from '@/types';
import { getParallelColClass } from '@/utilities';

export function ParallelResultsGrid({
  messages,
  prompt = '',
  t,
}: ParallelResultsGridProps): React.ReactElement {
  const { responses, fastestModel, bestModel, exportAll } = useParallelResultsGrid(messages, prompt);

  if (messages.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">{t('compare.noResults')}</p>
    );
  }

  const colClass = getParallelColClass(messages.length);
  const hasCompletedResult = responses.some((r) => r.status === ParallelModelStatus.COMPLETED);

  return (
    <div className="space-y-3">
      {hasCompletedResult ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportAll}>
            <Download className="h-3.5 w-3.5" />
            {t('compare.exportAll')}
          </Button>
        </div>
      ) : null}

      <div className={`grid gap-4 ${colClass}`}>
        {responses.map((r) => (
          <CompareResultCard
            key={`${r.provider}:${r.model}`}
            response={r}
            isFastest={r.status === ParallelModelStatus.COMPLETED && r.model === fastestModel}
            isBest={
              r.status === ParallelModelStatus.COMPLETED &&
              r.model === bestModel &&
              bestModel !== fastestModel
            }
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
