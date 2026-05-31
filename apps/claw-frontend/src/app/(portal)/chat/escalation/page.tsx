'use client';

import { GitFork, Loader2, Send } from 'lucide-react';

import { EscalationChainBuilder } from '@/components/chat/escalation-chain-builder';
import { EscalationResultCard } from '@/components/chat/escalation-result-card';
import { EscalationStepTimeline } from '@/components/chat/escalation-step-timeline';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useEscalationPage } from '@/hooks/chat/use-escalation-page';

export default function EscalationPage() {
  const {
    t,
    chainModels,
    prompt,
    setPrompt,
    handleAddModel,
    handleRemoveModel,
    handleMoveUp,
    handleMoveDown,
    handleSend,
    isPending,
    isError,
    canSend,
    selectionError,
    synthesisMessage,
    isPolling,
    isSynthesisReady,
    handleViewInThread,
  } = useEscalationPage();

  const showLoading = isPending || (isPolling && !isSynthesisReady);
  const showResults = isSynthesisReady && synthesisMessage !== null;
  const showEmpty = !isPending && !isPolling && !isSynthesisReady && !isError;

  return (
    <div className="space-y-6">
      <PageHeader title={t('escalation.title')} description={t('escalation.description')} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <EscalationChainBuilder
            chainModels={chainModels}
            onAddModel={handleAddModel}
            onRemoveModel={handleRemoveModel}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
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
                placeholder={t('escalation.sendPrompt')}
                className="min-h-[100px] resize-y"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={handleSend} disabled={!canSend}>
                  {isPending || isPolling ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="me-2 h-4 w-4" />
                  )}
                  {isPending || isPolling ? t('escalation.running') : t('escalation.sendPrompt')}
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
          <p className="text-center text-sm text-muted-foreground">
            {t('escalation.synthesizing')}
          </p>
        </div>
      ) : null}

      {showResults && synthesisMessage !== null ? (
        <div className="space-y-4">
          <EscalationResultCard
            result={synthesisMessage}
            onViewInThread={handleViewInThread}
            t={t}
          />
          <EscalationStepTimeline stepResults={synthesisMessage.metadata.stepResults} t={t} />
        </div>
      ) : null}

      {isError ? (
        <Card className="border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{t('escalation.sendFailed')}</p>
        </Card>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon={GitFork}
          title={t('escalation.noResults')}
          description={t('escalation.description')}
        />
      ) : null}
    </div>
  );
}
