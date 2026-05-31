'use client';

import { Coins, Loader2, Send } from 'lucide-react';

import { AdvancedModuleModelSelector } from '@/components/chat/advanced-module-model-selector';
import { CostEnsembleResultCard } from '@/components/chat/cost-ensemble-result-card';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useCostEnsemblePage } from '@/hooks/chat/use-cost-ensemble-page';

export default function CostEnsemblePage(): React.ReactElement {
  const {
    t,
    content,
    setContent,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSend,
    isPending,
    isError,
    isCostEnsembleError,
    costEnsembleResult,
    isPolling,
    isCostEnsembleReady,
    handleViewInThread,
  } = useCostEnsemblePage();

  const hasAnyError = isError || isCostEnsembleError;
  const showLoading = isPending || (isPolling && !isCostEnsembleReady && !isCostEnsembleError);
  const showResults = isCostEnsembleReady && costEnsembleResult !== null;
  const showEmpty = !isPending && !isPolling && !isCostEnsembleReady && !hasAnyError;

  return (
    <div className="space-y-6">
      <PageHeader title={t('costEnsemble.title')} description={t('costEnsemble.description')} />

      <Card>
        <CardContent className="pt-4">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="cost-ensemble-content">
            {t('costEnsemble.contentLabel')}
          </label>
          <Textarea
            id="cost-ensemble-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('costEnsemble.contentPlaceholder')}
            className="min-h-[160px] resize-y"
          />
          <div className="mt-4">
            <AdvancedModuleModelSelector
              t={t}
              value={selectedModel}
              onChange={setSelectedModel}
              disabled={isPending || isPolling}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={handleSend} disabled={!canSend}>
              {isPending || isPolling ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="me-2 h-4 w-4" />
              )}
              {isPending || isPolling ? t('costEnsemble.running') : t('costEnsemble.sendPrompt')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showLoading ? (
        <div className="space-y-4">
          <Card className="p-4">
            <Skeleton className="mb-2 h-4 w-1/3" />
            <Skeleton className="mb-2 h-3 w-full" />
            <Skeleton className="mb-2 h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </Card>
          <p className="text-center text-sm text-muted-foreground">
            {t('costEnsemble.synthesizing')}
          </p>
        </div>
      ) : null}

      {showResults && costEnsembleResult !== null ? (
        <CostEnsembleResultCard
          result={costEnsembleResult}
          onViewInThread={handleViewInThread}
          t={t}
        />
      ) : null}

      {hasAnyError ? (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{t('costEnsemble.sendFailed')}</p>
        </Card>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={Coins}
          title={t('costEnsemble.noResults')}
          description={t('costEnsemble.description')}
        />
      ) : null}
    </div>
  );
}
