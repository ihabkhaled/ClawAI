'use client';

import { Trophy } from 'lucide-react';

import { BestOfNCountSelector } from '@/components/chat/best-of-n-count-selector';
import { BestOfNResultCard } from '@/components/chat/best-of-n-result-card';
import { OrchestrationLabInfo } from '@/components/chat/orchestration/orchestration-lab-info';
import { OrchestrationPageShell } from '@/components/chat/orchestration/orchestration-page-shell';
import { EmptyState } from '@/components/common/empty-state';
import { useBestOfNPage } from '@/hooks/chat/use-best-of-n-page';

export default function BestOfNPage(): React.ReactElement {
  const {
    t,
    content,
    setContent,
    n,
    setN,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSubmit,
    isPending,
    isPolling,
    stages,
    hasProgress,
    errorMessage,
    isBestOfNReady,
    bestOfNResult,
    handleViewInThread,
  } = useBestOfNPage();

  const isRunning = isPending || isPolling;
  const resultSlot =
    isBestOfNReady && bestOfNResult !== null ? (
      <BestOfNResultCard result={bestOfNResult} onViewInThread={handleViewInThread} t={t} />
    ) : null;

  return (
    <OrchestrationPageShell
      headerIcon={Trophy}
      headerTitle={t('nav.bestOfNLab')}
      headerDescription={t('bestOfN.description')}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      prompt={content}
      onPromptChange={setContent}
      promptLabel={t('bestOfN.contentLabel')}
      promptPlaceholder={t('bestOfN.contentPlaceholder')}
      extraFieldsSlot={
        <BestOfNCountSelector value={n} onChange={setN} disabled={isRunning} t={t} />
      }
      onSubmit={handleSend}
      submitLabel={isRunning ? t('bestOfN.running') : t('bestOfN.sendPrompt')}
      isSubmitDisabled={!canSubmit || isRunning}
      isPending={isRunning}
      hasProgress={hasProgress}
      stages={stages}
      resultSlot={resultSlot}
      emptySlot={
        <>
          <EmptyState
            icon={Trophy}
            title={t('bestOfN.noResults')}
            description={t('bestOfN.description')}
          />
          <OrchestrationLabInfo
            goal={t('bestOfN.goal')}
            benefits={[t('bestOfN.benefit1'), t('bestOfN.benefit2'), t('bestOfN.benefit3')]}
            t={t}
          />
        </>
      }
      errorMessage={errorMessage}
      t={t}
    />
  );
}
