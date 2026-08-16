'use client';

import { Wrench } from 'lucide-react';

import { OrchestrationLabInfo } from '@/components/chat/orchestration/orchestration-lab-info';
import { OrchestrationPageShell } from '@/components/chat/orchestration/orchestration-page-shell';
import { RepairResultCard } from '@/components/chat/repair-result-card';
import { RepairTypeSelector } from '@/components/chat/repair-type-selector';
import { EmptyState } from '@/components/common/empty-state';
import { useRepairPage } from '@/hooks/chat/use-repair-page';

export default function RepairPage(): React.ReactElement {
  const {
    t,
    content,
    setContent,
    selectedRepairTypes,
    handleToggleRepairType,
    selectedModel,
    setSelectedModel,
    handleSend,
    isPending,
    canSubmit,
    repairMessage,
    isPolling,
    isRepairReady,
    handleViewInThread,
    stages,
    hasProgress,
    errorMessage,
  } = useRepairPage();

  // The orchestration shell handles model+prompt gating itself. We
  // additionally force-disable submit while no repair type is selected
  // (zero ticks ⇒ no repair lane to run).
  const isSubmitDisabled = !canSubmit;

  const isRunActive = isPending || isPolling;
  const showResult = isRepairReady && repairMessage !== null;

  return (
    <OrchestrationPageShell
      headerIcon={Wrench}
      headerTitle={t('nav.repairLab')}
      headerDescription={t('repair.description')}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      prompt={content}
      onPromptChange={setContent}
      promptLabel={t('repair.contentLabel')}
      promptPlaceholder={t('repair.contentPlaceholder')}
      extraFieldsSlot={
        <RepairTypeSelector
          selectedTypes={selectedRepairTypes}
          onToggle={handleToggleRepairType}
          t={t}
        />
      }
      onSubmit={handleSend}
      submitLabel={isRunActive ? t('repair.running') : t('repair.sendPrompt')}
      isSubmitDisabled={isSubmitDisabled}
      isPending={isRunActive}
      hasProgress={hasProgress}
      stages={stages}
      resultSlot={
        showResult ? (
          <RepairResultCard result={repairMessage} onViewInThread={handleViewInThread} t={t} />
        ) : undefined
      }
      emptySlot={
        <>
          <EmptyState
            icon={Wrench}
            title={t('repair.empty.title')}
            description={t('repair.empty.description')}
          />
          <OrchestrationLabInfo
            goal={t('repair.goal')}
            benefits={[t('repair.benefit1'), t('repair.benefit2'), t('repair.benefit3')]}
            t={t}
          />
        </>
      }
      errorMessage={errorMessage}
      t={t}
    />
  );
}
