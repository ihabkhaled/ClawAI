'use client';

import { Coins } from 'lucide-react';

import { CostEnsembleResultCard } from '@/components/chat/cost-ensemble-result-card';
import { OrchestrationPageShell } from '@/components/chat/orchestration/orchestration-page-shell';
import { EmptyState } from '@/components/common/empty-state';
import { useCostEnsemblePage } from '@/hooks/chat/use-cost-ensemble-page';

export default function CostEnsemblePage(): React.ReactElement {
  const {
    t,
    content,
    setContent,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSubmit,
    isRunning,
    isError,
    isCostEnsembleError,
    isCostEnsembleReady,
    costEnsembleResult,
    handleViewInThread,
    stages,
    hasProgress,
  } = useCostEnsemblePage();

  const hasAnyError = isError || isCostEnsembleError;
  const errorMessage = hasAnyError ? t('costEnsemble.sendFailed') : null;

  const resultSlot =
    isCostEnsembleReady && costEnsembleResult !== null ? (
      <CostEnsembleResultCard
        result={costEnsembleResult}
        onViewInThread={handleViewInThread}
        t={t}
      />
    ) : null;

  const emptySlot = (
    <EmptyState
      icon={Coins}
      title={t('costEnsemble.noResults')}
      description={t('costEnsemble.description')}
    />
  );

  return (
    <OrchestrationPageShell
      headerIcon={Coins}
      headerTitle={t('nav.costEnsemble')}
      headerDescription={t('costEnsemble.description')}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      prompt={content}
      onPromptChange={setContent}
      promptLabel={t('costEnsemble.contentLabel')}
      promptPlaceholder={t('costEnsemble.contentPlaceholder')}
      onSubmit={handleSend}
      submitLabel={t('costEnsemble.sendPrompt')}
      isSubmitDisabled={!canSubmit}
      isPending={isRunning}
      hasProgress={hasProgress}
      stages={stages}
      resultSlot={resultSlot}
      emptySlot={emptySlot}
      errorMessage={errorMessage}
      t={t}
    />
  );
}
