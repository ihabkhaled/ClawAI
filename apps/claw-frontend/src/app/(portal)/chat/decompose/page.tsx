'use client';

import { Layers } from 'lucide-react';

import { DecomposeMaxSubTasksSelect } from '@/components/chat/decompose-max-sub-tasks-select';
import { DecompositionResultCard } from '@/components/chat/decomposition-result-card';
import { OrchestrationPageShell } from '@/components/chat/orchestration/orchestration-page-shell';
import { EmptyState } from '@/components/common/empty-state';
import { useDecomposePage } from '@/hooks/chat/use-decompose-page';

export default function DecomposePage(): React.ReactElement {
  const {
    t,
    content,
    setContent,
    maxSubTasks,
    setMaxSubTasks,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSubmit,
    isPending,
    isPolling,
    decompositionResult,
    isDecompositionReady,
    handleViewInThread,
    stages,
    hasProgress,
    errorMessage,
  } = useDecomposePage();

  const isRunning = isPending || isPolling;
  const submitLabel = isRunning ? t('decompose.running') : t('decompose.sendPrompt');

  const resultSlot =
    isDecompositionReady && decompositionResult !== null ? (
      <DecompositionResultCard
        result={decompositionResult}
        onViewInThread={handleViewInThread}
        t={t}
      />
    ) : null;

  const emptySlot = (
    <EmptyState
      icon={Layers}
      title={t('decompose.noResults')}
      description={t('decompose.description')}
    />
  );

  return (
    <OrchestrationPageShell
      headerIcon={Layers}
      headerTitle={t('nav.decomposeLab')}
      headerDescription={t('decompose.description')}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      prompt={content}
      onPromptChange={setContent}
      promptLabel={t('decompose.contentLabel')}
      promptPlaceholder={t('decompose.contentPlaceholder')}
      extraFieldsSlot={
        <DecomposeMaxSubTasksSelect
          value={maxSubTasks}
          onChange={setMaxSubTasks}
          disabled={isRunning}
          t={t}
        />
      }
      onSubmit={handleSend}
      submitLabel={submitLabel}
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
