'use client';

import { Layers } from 'lucide-react';

import { ConsensusModelBreakdown } from '@/components/chat/consensus-model-breakdown';
import { ConsensusSynthesisCard } from '@/components/chat/consensus-synthesis-card';
import { OrchestrationPageShell } from '@/components/chat/orchestration/orchestration-page-shell';
import { ParallelModelSelector } from '@/components/chat/parallel-model-selector';
import { EmptyState } from '@/components/common/empty-state';
import { useConsensusPage } from '@/hooks/chat/use-consensus-page';

// Consensus Mode lab page — adopts the shared <OrchestrationPageShell>.
//
// The shell owns the gradient header, the single-model picker (the
// "lead" model), the prompt textarea, the submit button, the four
// output states (loading skeleton, live progress timeline, result,
// empty), and the error alert. The consensus-specific fleet picker
// (2-5 models) lives in the shell's `extraFieldsSlot`. The result
// column is the original ConsensusSynthesisCard + ConsensusModelBreakdown
// pair — only the surrounding chrome changed.
export default function ConsensusPage(): React.ReactElement {
  const {
    t,
    selectedModel,
    setSelectedModel,
    selectedModels,
    prompt,
    setPrompt,
    handleToggleModel,
    handleSend,
    isPending,
    canSubmit,
    selectionError,
    synthesisMessage,
    handleViewInThread,
    stages,
    hasProgress,
    errorMessage,
  } = useConsensusPage();

  return (
    <OrchestrationPageShell
      headerIcon={Layers}
      headerTitle={t('nav.consensusMode')}
      headerDescription={t('consensus.description')}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      prompt={prompt}
      onPromptChange={setPrompt}
      promptLabel={t('consensus.promptLabel')}
      promptPlaceholder={t('consensus.promptPlaceholder')}
      extraFieldsSlot={
        <ParallelModelSelector
          selectedModels={selectedModels}
          onToggleModel={handleToggleModel}
          selectionError={selectionError}
          t={t}
        />
      }
      onSubmit={handleSend}
      submitLabel={isPending ? t('consensus.running') : t('consensus.sendPrompt')}
      isSubmitDisabled={!canSubmit}
      isPending={isPending}
      hasProgress={hasProgress}
      stages={stages}
      resultSlot={
        synthesisMessage !== null ? (
          <>
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
          </>
        ) : null
      }
      emptySlot={
        <EmptyState
          icon={Layers}
          title={t('consensus.noResults')}
          description={t('consensus.description')}
        />
      }
      errorMessage={errorMessage}
      t={t}
    />
  );
}
