import { useCallback, useState } from 'react';

import { MIN_PARALLEL_MODELS, MAX_PARALLEL_MODELS } from '@/constants';
import { DEFAULT_RESEARCH_OPTIONS } from '@/constants/research.constants';
import { ResearchMode } from '@/enums';
import { useJudgeModelOptions } from '@/hooks/chat/use-judge-model-options';
import { useParallelCompare } from '@/hooks/chat/use-parallel-compare';
import { useParallelPoll } from '@/hooks/chat/use-parallel-poll';
import { useParallelStream } from '@/hooks/chat/use-parallel-stream';
import { useComposerAttachments } from '@/hooks/files/use-composer-attachments';
import { useResearchProviders } from '@/hooks/research/use-research-providers';
import { useTranslation } from '@/lib/i18n';
import type { ParallelModelTarget, ResearchOptions, UseParallelComparePageReturn } from '@/types';
import { hasSendableInput } from '@/utilities/composer-send.utility';

export function useParallelComparePage(): UseParallelComparePageReturn {
  const { t } = useTranslation();
  const { options: judgeModelOptions, isLoading: isJudgeModelOptionsLoading } =
    useJudgeModelOptions();
  const [selectedModels, setSelectedModels] = useState<ParallelModelTarget[]>([]);
  const [prompt, setPrompt] = useState('');
  const [judgeEnabled, setJudgeEnabled] = useState(false);
  const [judgeModel, setJudgeModel] = useState<string | null>(null);
  const [criticEnabled, setCriticEnabled] = useState(false);
  const [criticModel, setCriticModel] = useState<string | null>(null);
  // AUTO, not NONE. Compare was the last surface still defaulting research
  // off, so the same question answered from the web in chat was answered from
  // training data here. AUTO lets a small model decide per turn.
  const [research, setResearch] = useState<ResearchOptions>(DEFAULT_RESEARCH_OPTIONS);
  const researchProviderQuery = useResearchProviders();
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const { ingestFiles, removeAttachment, isUploading, pendingUploads, progress } =
    useComposerAttachments({
      selectedFileIds,
      onChange: setSelectedFileIds,
    });
  const { send, result, isPending, isError, upgradeFeature, clearUpgradeFeature } =
    useParallelCompare();

  const threadId = result?.threadId ?? null;
  const { pollingMessages, isPolling, allResponded, isParallelError, handleViewInThread } =
    useParallelPoll(threadId, selectedModels.length);
  const { lanes: laneStreams } = useParallelStream(threadId ?? undefined, isPending || isPolling);

  const selectionError =
    selectedModels.length > 0 && selectedModels.length < MIN_PARALLEL_MODELS
      ? t('compare.minModels', { min: MIN_PARALLEL_MODELS })
      : null;

  // Resolve a user-visible error for the poll-detected failure path (every
  // lane errored, or none ever came back before the poll backstop tripped).
  // The initial-send failure already renders through `isError` below /
  // upgradeFeature; this covers the run that WAS accepted but never
  // completed.
  const errorMessage = isParallelError ? t('compare.compareFailed') : null;

  const canSend =
    selectedModels.length >= MIN_PARALLEL_MODELS &&
    selectedModels.length <= MAX_PARALLEL_MODELS &&
    // Words or files — an attachment alone is a complete request — and never
    // while a file is still uploading, or it would go out without it.
    hasSendableInput(prompt, selectedFileIds.length) &&
    !isUploading &&
    !isPending &&
    !isPolling;

  const handleToggleModel = useCallback((provider: string, model: string, checked: boolean) => {
    setSelectedModels((prev) => {
      if (checked) {
        if (prev.length >= MAX_PARALLEL_MODELS) {
          return prev;
        }
        return [...prev, { provider, model }];
      }
      return prev.filter((m) => m.provider !== provider || m.model !== model);
    });
  }, []);

  const handleSend = useCallback(() => {
    if (!canSend) {
      return;
    }
    send({
      content: prompt.trim(),
      models: selectedModels,
      judgeEnabled,
      judgeModel,
      // Critic only flows up when judge is on too — DTO refine on the backend
      // rejects criticEnabled=true without judgeEnabled=true. The model is
      // optional from the FE's perspective; backend rejects it if missing.
      ...(judgeEnabled && criticEnabled ? { criticEnabled: true, criticModel } : {}),
      // Only attach the fields when the user picked a non-NONE mode so v1
      // server-side defaults stay the source of truth for the OFF path. The
      // provider rides along exactly the same way — the DTO already took it.
      ...(research.mode === ResearchMode.NONE
        ? {}
        : {
            researchMode: research.mode,
            ...(research.providerId === undefined
              ? {}
              : { researchProviderId: research.providerId }),
          }),
      // Only attach file IDs when the user picked at least one; omit
      // entirely on the empty path so the BE DTO stays clean.
      ...(selectedFileIds.length > 0 ? { fileIds: selectedFileIds } : {}),
    });
    setSelectedFileIds([]);
  }, [
    canSend,
    send,
    prompt,
    selectedModels,
    judgeEnabled,
    judgeModel,
    criticEnabled,
    criticModel,
    research,
    selectedFileIds,
  ]);

  return {
    t,
    selectedModels,
    prompt,
    setPrompt,
    handleToggleModel,
    handleSend,
    result,
    isPending,
    isError,
    canSend,
    selectionError,
    pollingMessages,
    isPolling,
    allResponded,
    isParallelError,
    errorMessage,
    laneStreams,
    handleViewInThread,
    judgeEnabled,
    setJudgeEnabled,
    judgeModel,
    setJudgeModel,
    judgeModelOptions,
    isJudgeModelOptionsLoading,
    criticEnabled,
    setCriticEnabled,
    criticModel,
    setCriticModel,
    research,
    setResearch,
    researchProviders: researchProviderQuery.providers,
    isResearchProvidersLoading: researchProviderQuery.isLoading,
    selectedFileIds,
    setSelectedFileIds,
    ingestFiles,
    attachmentTray: {
      fileIds: selectedFileIds,
      pendingUploads,
      progress,
      onRemove: removeAttachment,
      disabled: isPending || isPolling,
    },
    upgradeFeature,
    clearUpgradeFeature,
  };
}
