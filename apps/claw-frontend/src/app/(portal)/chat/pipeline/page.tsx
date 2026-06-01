'use client';

import { GitBranch, Layers } from 'lucide-react';

import { OrchestrationPageShell } from '@/components/chat/orchestration/orchestration-page-shell';
import { PipelineResultCard } from '@/components/chat/pipeline-result-card';
import { EmptyState } from '@/components/common/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PIPELINE_TEMPLATE_OPTIONS } from '@/constants';
import { usePipelinePage } from '@/hooks/chat/use-pipeline-page';

export default function PipelinePage(): React.ReactElement {
  const {
    t,
    content,
    setContent,
    template,
    setTemplate,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSubmit,
    isPending,
    pipelineResult,
    isPolling,
    isPipelineReady,
    stages,
    hasProgress,
    errorMessage,
    handleViewInThread,
  } = usePipelinePage();

  const shellIsPending = isPending || (isPolling && !isPipelineReady);
  const submitLabel = shellIsPending ? t('pipeline.running') : t('pipeline.sendPrompt');

  const extraFieldsSlot = (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground" htmlFor="pipeline-template">
        {t('pipeline.templateLabel')}
      </label>
      <Select value={template} onValueChange={setTemplate} disabled={shellIsPending}>
        <SelectTrigger id="pipeline-template">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PIPELINE_TEMPLATE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const resultSlot =
    isPipelineReady && pipelineResult !== null ? (
      <PipelineResultCard result={pipelineResult} onViewInThread={handleViewInThread} t={t} />
    ) : null;

  const emptySlot = (
    <EmptyState
      icon={Layers}
      title={t('pipeline.noResults')}
      description={t('pipeline.description')}
    />
  );

  return (
    <OrchestrationPageShell
      headerIcon={GitBranch}
      headerTitle={t('nav.pipelineLab')}
      headerDescription={t('pipeline.description')}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      prompt={content}
      onPromptChange={setContent}
      promptLabel={t('pipeline.contentLabel')}
      promptPlaceholder={t('pipeline.contentPlaceholder')}
      extraFieldsSlot={extraFieldsSlot}
      onSubmit={handleSend}
      submitLabel={submitLabel}
      isSubmitDisabled={!canSubmit}
      isPending={shellIsPending}
      hasProgress={hasProgress}
      stages={stages}
      resultSlot={resultSlot}
      emptySlot={emptySlot}
      errorMessage={errorMessage}
      t={t}
    />
  );
}
