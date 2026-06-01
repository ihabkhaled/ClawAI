'use client';

import { GitFork } from 'lucide-react';
import type * as React from 'react';

import { EscalationChainBuilder } from '@/components/chat/escalation-chain-builder';
import { EscalationResultCard } from '@/components/chat/escalation-result-card';
import { EscalationStepTimeline } from '@/components/chat/escalation-step-timeline';
import { OrchestrationPageShell } from '@/components/chat/orchestration/orchestration-page-shell';
import { EmptyState } from '@/components/common/empty-state';
import { useEscalationPage } from '@/hooks/chat/use-escalation-page';

// The Escalation Chain lab. Renders the shared <OrchestrationPageShell>:
//   • single-model select picks the PRIMARY (step-1) model
//   • prompt textarea + submit button live in the shell's input column
//   • the existing EscalationChainBuilder slots into `extraFieldsSlot` so
//     the user can add additional escalation steps (BE requires total
//     chain length 2..5)
//   • the output column flips between progress timeline → result card +
//     per-step timeline → empty state, all owned by the shell
export default function EscalationPage(): React.ReactElement {
  const {
    t,
    selectedModel,
    setSelectedModel,
    additionalChainModels,
    prompt,
    setPrompt,
    handleAddModel,
    handleRemoveModel,
    handleMoveUp,
    handleMoveDown,
    handleSend,
    isPending,
    isError,
    canSubmit,
    selectionError,
    stages,
    synthesisMessage,
    isPolling,
    isSynthesisReady,
    handleViewInThread,
  } = useEscalationPage();

  const isRunning = isPending || isPolling;
  const hasProgress = stages.length > 0;
  const showResults = isSynthesisReady && synthesisMessage !== null;
  const errorMessage = isError ? t('escalation.sendFailed') : null;

  const extraFieldsSlot = (
    <EscalationChainBuilder
      chainModels={additionalChainModels}
      onAddModel={handleAddModel}
      onRemoveModel={handleRemoveModel}
      onMoveUp={handleMoveUp}
      onMoveDown={handleMoveDown}
      selectionError={selectionError}
      t={t}
    />
  );

  const resultSlot = showResults ? (
    <>
      <EscalationResultCard result={synthesisMessage} onViewInThread={handleViewInThread} t={t} />
      <EscalationStepTimeline stepResults={synthesisMessage.metadata.stepResults} t={t} />
    </>
  ) : null;

  const emptySlot = (
    <EmptyState
      icon={GitFork}
      title={t('escalation.noResults')}
      description={t('escalation.description')}
    />
  );

  return (
    <OrchestrationPageShell
      headerIcon={GitFork}
      headerTitle={t('nav.escalationChain')}
      headerDescription={t('escalation.description')}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      prompt={prompt}
      onPromptChange={setPrompt}
      promptLabel={t('escalation.contentLabel')}
      promptPlaceholder={t('escalation.contentPlaceholder')}
      extraFieldsSlot={extraFieldsSlot}
      onSubmit={handleSend}
      submitLabel={isRunning ? t('escalation.running') : t('escalation.sendPrompt')}
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
