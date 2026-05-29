'use client';

import { ArrowRight, GitCompareArrows, Loader2, Send } from 'lucide-react';

import { CompareJudgeControls } from '@/components/chat/compare-judge-controls';
import { DailyTokenIndicator } from '@/components/chat/daily-token-indicator';
import { ParallelModelSelector } from '@/components/chat/parallel-model-selector';
import { ParallelResultsGrid } from '@/components/chat/parallel-results-grid';
import { ParallelSummaryBar } from '@/components/chat/parallel-summary-bar';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useParallelComparePage } from '@/hooks/chat/use-parallel-compare-page';

export default function ComparePage() {
  const {
    t,
    selectedModels,
    prompt,
    setPrompt,
    handleToggleModel,
    handleSend,
    isPending,
    canSend,
    selectionError,
    pollingMessages,
    isPolling,
    allResponded,
    handleViewInThread,
    judgeEnabled,
    setJudgeEnabled,
    judgeModel,
    setJudgeModel,
    judgeModelOptions,
    isJudgeModelOptionsLoading,
  } = useParallelComparePage();

  const showLoading = isPending || (isPolling && pollingMessages.length === 0);
  const showResults = pollingMessages.length > 0;
  const showEmpty = !isPending && !isPolling && pollingMessages.length === 0;

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t('compare.title')} description={t('compare.description')} />

      <DailyTokenIndicator />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="space-y-4">
            <ParallelModelSelector
              selectedModels={selectedModels}
              onToggleModel={handleToggleModel}
              selectionError={selectionError}
              t={t}
            />
            <CompareJudgeControls
              judgeEnabled={judgeEnabled}
              onJudgeEnabledChange={setJudgeEnabled}
              judgeModel={judgeModel}
              onJudgeModelChange={setJudgeModel}
              judgeModelOptions={judgeModelOptions}
              judgeModelOptionsLoading={isJudgeModelOptionsLoading}
              t={t}
            />
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="pt-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('compare.sendPrompt')}
                className="min-h-[100px] resize-y"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={handleSend} disabled={!canSend}>
                  {isPending || isPolling ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="me-2 h-4 w-4" />
                  )}
                  {isPending || isPolling ? t('compare.comparing') : t('compare.sendPrompt')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {selectedModels.map((m) => (
            <Card key={`${m.provider}:${m.model}`} className="p-4">
              <Skeleton className="mb-2 h-4 w-2/3" />
              <Skeleton className="mb-4 h-3 w-1/3" />
              <Skeleton className="mb-2 h-3 w-full" />
              <Skeleton className="mb-2 h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
            </Card>
          ))}
        </div>
      ) : null}

      {showResults ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('compare.results')}</span>
              <Badge variant="secondary">
                {pollingMessages.length} / {selectedModels.length}
              </Badge>
              {isPolling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            {allResponded ? (
              <Button variant="outline" size="sm" onClick={handleViewInThread}>
                {t('compare.viewInThread')}
                <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>

          {allResponded ? <ParallelSummaryBar messages={pollingMessages} t={t} /> : null}

          <ParallelResultsGrid messages={pollingMessages} prompt={prompt} t={t} />
        </div>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={GitCompareArrows}
          title={t('compare.noResults')}
          description={t('compare.description')}
        />
      ) : null}
    </div>
  );
}
