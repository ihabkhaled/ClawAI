'use client';

import { Layers, Loader2, Send } from 'lucide-react';

import { DecompositionResultCard } from '@/components/chat/decomposition-result-card';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useDecomposePage } from '@/hooks/chat/use-decompose-page';

export default function DecomposePage() {
  const {
    t,
    content,
    setContent,
    maxSubTasks,
    setMaxSubTasks,
    handleSend,
    canSend,
    isPending,
    isError,
    isDecompositionError,
    decompositionResult,
    isPolling,
    isDecompositionReady,
    handleViewInThread,
  } = useDecomposePage();

  const hasAnyError = isError || isDecompositionError;
  const showLoading = isPending || (isPolling && !isDecompositionReady && !isDecompositionError);
  const showResults = isDecompositionReady && decompositionResult !== null;
  const showEmpty = !isPending && !isPolling && !isDecompositionReady && !hasAnyError;

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t('decompose.title')} description={t('decompose.description')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="pt-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="decompose-content">
                {t('decompose.contentLabel')}
              </label>
              <Textarea
                id="decompose-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('decompose.contentPlaceholder')}
                className="min-h-[160px] resize-y"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={handleSend} disabled={!canSend}>
                  {isPending || isPolling ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="me-2 h-4 w-4" />
                  )}
                  {isPending || isPolling ? t('decompose.running') : t('decompose.sendPrompt')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="max-sub-tasks">
                {t('decompose.maxSubTasks')}
              </label>
              <select
                id="max-sub-tasks"
                value={maxSubTasks}
                onChange={(e) => setMaxSubTasks(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </CardContent>
          </Card>
        </div>
      </div>

      {showLoading ? (
        <div className="space-y-4">
          <Card className="p-4">
            <Skeleton className="mb-2 h-4 w-1/2" />
            <Skeleton className="mb-2 h-3 w-full" />
            <Skeleton className="mb-2 h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </Card>
          <p className="text-center text-sm text-muted-foreground">{t('decompose.synthesizing')}</p>
        </div>
      ) : null}

      {showResults && decompositionResult !== null ? (
        <DecompositionResultCard
          result={decompositionResult}
          onViewInThread={handleViewInThread}
          t={t}
        />
      ) : null}

      {hasAnyError ? (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{t('decompose.sendFailed')}</p>
        </Card>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={Layers}
          title={t('decompose.noResults')}
          description={t('decompose.description')}
        />
      ) : null}
    </div>
  );
}
