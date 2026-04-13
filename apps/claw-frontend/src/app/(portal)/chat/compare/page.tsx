'use client';

import { GitCompareArrows, Loader2, Send } from 'lucide-react';

import { ParallelModelSelector } from '@/components/chat/parallel-model-selector';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
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
  } = useParallelComparePage();

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t('compare.title')} description={t('compare.description')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ParallelModelSelector
            selectedModels={selectedModels}
            onToggleModel={handleToggleModel}
            selectionError={selectionError}
            t={t}
          />
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
                  {isPending ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="me-2 h-4 w-4" />
                  )}
                  {isPending ? t('compare.comparing') : t('compare.sendPrompt')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isPending ? (
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

      {!isPending ? (
        <EmptyState
          icon={GitCompareArrows}
          title={t('compare.noResults')}
          description={t('compare.description')}
        />
      ) : null}
    </div>
  );
}
