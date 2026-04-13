import { Play, X } from 'lucide-react';

import { ParallelModelSelector } from '@/components/chat/parallel-model-selector';
import { ParallelResultsGrid } from '@/components/chat/parallel-results-grid';
import { ParallelSummaryBar } from '@/components/chat/parallel-summary-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { InThreadComparePanelProps } from '@/types';
import { getFastestModel } from '@/utilities';

export function InThreadComparePanel({
  selectedModels,
  onToggleModel,
  onCompare,
  onClose,
  result,
  isPending,
  canSend,
  t,
}: InThreadComparePanelProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{t('compare.title')}</CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <ParallelModelSelector
          selectedModels={selectedModels}
          onToggleModel={onToggleModel}
          selectionError={null}
          t={t}
        />

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('compare-prompt') as HTMLInputElement;
            if (input.value.trim()) {
              onCompare(input.value);
              input.value = '';
            }
          }}
        >
          <Input
            name="compare-prompt"
            placeholder={t('compare.description')}
            className="flex-1"
            disabled={isPending}
          />
          <Button type="submit" disabled={!canSend || isPending} size="sm">
            <Play className="me-2 h-4 w-4" />
            {isPending ? t('compare.comparing') : t('compare.sendPrompt')}
          </Button>
        </form>

        {result ? (
          <>
            <ParallelSummaryBar
              totalLatencyMs={result.totalLatencyMs}
              completedCount={result.completedCount}
              failedCount={result.failedCount}
              fastestModel={getFastestModel(result.responses)}
              t={t}
            />
            <ParallelResultsGrid
              responses={result.responses}
              fastestModel={getFastestModel(result.responses)}
              t={t}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
