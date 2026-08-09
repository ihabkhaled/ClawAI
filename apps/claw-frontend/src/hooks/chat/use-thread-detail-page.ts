'use client';

import { useParams } from 'next/navigation';

import { ROUTES } from '@/constants';
import { PlanFeature } from '@/enums';
import { usePlanFeatures } from '@/hooks/auth/use-plan-features';
import { useEditableTitle } from '@/hooks/chat/use-editable-title';
import { useInThreadCompare } from '@/hooks/chat/use-in-thread-compare';
import { useResizableComposer } from '@/hooks/chat/use-resizable-composer';
import { useThreadDataController } from '@/hooks/chat/use-thread-data-controller';
import { useShareChatController } from '@/hooks/chat-shares/use-share-chat-controller';
import { useToggle } from '@/hooks/common/use-toggle';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { ChatThreadShellProps, UseThreadDetailPageReturn } from '@/types';

// Page-bootstrap controller for /chat/[threadId]. The .tsx may call EXACTLY
// ONE hook (this one). Composes useParams + useTranslation + the data
// controller + four small UI hooks and returns a single shell-props bag.
export const useThreadDetailPage = (): UseThreadDetailPageReturn => {
  const params = useParams<{ threadId: string }>();
  const threadId = params.threadId ?? '';
  const { t } = useTranslation();
  const data = useThreadDataController({ threadId, t });
  const editableTitle = useEditableTitle(threadId, data.thread?.title ?? undefined);
  const { composerHeight, handleMouseDown } = useResizableComposer();
  const planFeatures = usePlanFeatures();
  const compare = useInThreadCompare({
    threadId,
    initialJudgeEnabled: data.threadSettings.judgeEnabled,
    initialJudgeModel: data.threadSettings.judgeModel,
  });

  const canCompare = planFeatures.has(PlanFeature.ALLOW_COMPARE_MODE);
  const canJudge = planFeatures.has(PlanFeature.ALLOW_JUDGE_MODE);
  const canResearch = planFeatures.has(PlanFeature.ALLOW_RESEARCH_MODE);
  const canCritic = planFeatures.has(PlanFeature.ALLOW_CRITIC_REVIEW);
  const title = data.thread?.title ?? t('chat.untitled');
  const deleteConfirm = useToggle(false);
  const share = useShareChatController(threadId.length > 0 ? threadId : null);

  const shellProps: ChatThreadShellProps = {
    threadId,
    isLoadingPlaceholder: !threadId,
    loadingLabel: t('chat.loadingThread'),
    title,
    thread: data.thread,
    editableTitle,
    canCompare,
    compareToggleOpen: compare.toggleOpen,
    compareIsOpen: compare.isOpen,
    threadSettingsOpen: data.threadSettings.isOpen,
    threadSettingsToggleOpen: data.threadSettings.toggleOpen,
    isDeleting: data.isDeleting,
    handleDelete: data.handleDelete,
    deleteConfirmOpen: deleteConfirm.isOpen,
    openDeleteConfirm: deleteConfirm.open,
    setDeleteConfirmOpen: (open: boolean): void => {
      if (open) {
        deleteConfirm.open();
      } else {
        deleteConfirm.close();
      }
    },
    deleteConfirmTitle: t('chat.deleteThread'),
    deleteConfirmDescription: t('chat.deleteThreadConfirm'),
    cancelLabel: t('common.cancel'),
    backToThreadsHref: ROUTES.CHAT,
    backToThreadsLabel: t('chat.backToThreads'),
    threadSettingsLabel: t('chat.threadSettings'),
    deleteLabel: t('common.delete'),
    compareLabel: t('compare.title'),
    shareButtonProps: share.buttonProps,
    shareDialogProps: share.dialogProps,
    inThreadComparePanelProps: {
      selectedModels: compare.selectedModels,
      onToggleModel: compare.handleToggleModel,
      prompt: compare.prompt,
      onPromptChange: compare.setPrompt,
      onSend: compare.handleSend,
      onClose: compare.toggleOpen,
      result: compare.result,
      isPending: compare.isPending,
      canSend: compare.canSend,
      judgeEnabled: compare.judgeEnabled,
      onJudgeEnabledChange: compare.setJudgeEnabled,
      judgeModel: compare.judgeModel,
      onJudgeModelChange: compare.setJudgeModel,
      judgeModelOptions: compare.judgeModelOptions,
      judgeModelOptionsLoading: compare.isJudgeModelOptionsLoading,
      criticEnabled: compare.criticEnabled,
      onCriticEnabledChange: compare.setCriticEnabled,
      criticModel: compare.criticModel,
      onCriticModelChange: compare.setCriticModel,
      researchMode: compare.researchMode,
      onResearchModeChange: compare.setResearchMode,
      allowJudgeMode: canJudge,
      allowCriticReview: canCritic,
      allowResearchMode: canResearch,
      selectedFileIds: compare.selectedFileIds,
      onSelectedFileIdsChange: compare.setSelectedFileIds,
      onIngestFiles: compare.ingestFiles,
      t,
    },
    threadSettingsProps: {
      t,
      systemPrompt: data.threadSettings.systemPrompt,
      onSystemPromptChange: data.threadSettings.setSystemPrompt,
      temperature: data.threadSettings.temperature,
      onTemperatureChange: data.threadSettings.setTemperature,
      maxTokens: data.threadSettings.maxTokens,
      onMaxTokensChange: data.threadSettings.setMaxTokens,
      selectedModel: data.threadSettings.selectedModel,
      onModelChange: data.threadSettings.handleModelChange,
      contextPackIds: data.threadSettings.contextPackIds,
      onContextPackIdsChange: data.threadSettings.setContextPackIds,
      judgeEnabled: data.threadSettings.judgeEnabled,
      onJudgeEnabledChange: data.threadSettings.setJudgeEnabled,
      judgeModel: data.threadSettings.judgeModel,
      onJudgeModelChange: data.threadSettings.setJudgeModel,
      judgeModelOptions: data.threadSettings.judgeModelOptions,
      allowJudgeMode: canJudge,
      qualityThreshold: data.threadSettings.qualityThreshold,
      onQualityThresholdChange: data.threadSettings.setQualityThreshold,
      maxReRouteAttempts: data.threadSettings.maxReRouteAttempts,
      onMaxReRouteAttemptsChange: data.threadSettings.setMaxReRouteAttempts,
      useMemory: data.threadSettings.useMemory,
      onUseMemoryChange: data.threadSettings.setUseMemory,
      useContext: data.threadSettings.useContext,
      onUseContextChange: data.threadSettings.setUseContext,
      onSave: data.threadSettings.handleSave,
      isPending: data.threadSettings.isPending,
      maxTokensError: data.threadSettings.maxTokensError,
      canSave: data.threadSettings.canSave,
    },
    virtualizedMessagesProps: data.virtualizedMessagesProps,
    composerHeight,
    onResizeHandleMouseDown: handleMouseDown,
    resizeAriaLabel: t('accessibility.resizeInput'),
    composerProps: {
      onSend: data.handleSend,
      isPending: data.isSending,
      selectedModel: data.threadSettings.selectedModel,
      onModelChange: data.threadSettings.handleModelChange,
      threadId,
    },
  };

  return { shellProps };
};
