'use client';

import { Layers, Loader2, Send } from 'lucide-react';

import { ConsensusModelBreakdown } from '@/components/chat/consensus-model-breakdown';
import { ConsensusSynthesisCard } from '@/components/chat/consensus-synthesis-card';
import { ParallelModelSelector } from '@/components/chat/parallel-model-selector';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useConsensusPage } from '@/hooks/chat/use-consensus-page';

export default function ConsensusPage() {
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
    synthesisMessage,
    isPolling,
    isSynthesisReady,
    handleViewInThread,
  } = useConsensusPage();

  const showLoading = isPending || (isPolling && !isSynthesisReady);
  const showResults = isSynthesisReady && synthesisMessage !== null;
  const showEmpty = !isPending && !isPolling && !isSynthesisReady;

  return (
    <div className="space-y-6">
      <PageHeader title={t('consensus.title')} description={t('consensus.description')} />

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
                placeholder={t('consensus.sendPrompt')}
                className="min-h-[100px] resize-y"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={handleSend} disabled={!canSend}>
                  {isPending || isPolling ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="me-2 h-4 w-4" />
                  )}
                  {isPending || isPolling ? t('consensus.running') : t('consensus.sendPrompt')}
                </Button>
              </div>
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
          <p className="text-center text-sm text-muted-foreground">{t('consensus.synthesizing')}</p>
        </div>
      ) : null}

      {showResults && synthesisMessage !== null ? (
        <div className="space-y-4">
          <ConsensusSynthesisCard
            synthesis={{
              finalAnswer: synthesisMessage.content,
              agreements: synthesisMessage.metadata.agreements,
              disagreements: synthesisMessage.metadata.disagreements,
              contradictions: synthesisMessage.metadata.contradictions,
              confidenceLevel: synthesisMessage.metadata.confidenceLevel,
              synthesisRationale: synthesisMessage.metadata.synthesisRationale,
              agreementScore: synthesisMessage.metadata.agreementScore,
            }}
            onViewInThread={handleViewInThread}
            t={t}
          />
          <ConsensusModelBreakdown breakdown={synthesisMessage.metadata.modelBreakdown} t={t} />
        </div>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={Layers}
          title={t('consensus.noResults')}
          description={t('consensus.description')}
        />
      ) : null}
    </div>
  );
}
