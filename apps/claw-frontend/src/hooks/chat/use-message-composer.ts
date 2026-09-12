'use client';

import {
  COMPOSER_MAX_ROWS,
  COMPOSER_MIN_ROWS,
  NEW_THREAD_DRAFT_KEY,
} from '@/constants/chat.constants';
import { MEDIA_QUERY_LG_UP } from '@/constants/media-query.constants';
import { ComposerControlVariant, PlanFeature } from '@/enums';
import { usePlanFeatures } from '@/hooks/auth/use-plan-features';
import { useMessageComposerState } from '@/hooks/chat/use-message-composer-state';
import { useMediaQuery } from '@/hooks/ui/use-media-query';
import { useTranslation } from '@/lib/i18n';
import type { MessageComposerProps, UseMessageComposerReturn } from '@/types';

/**
 * The one controller hook behind MessageComposer.
 *
 * The component used to call three hooks of its own, decide its own labels and
 * branch its own layout twice — a mobile control row and a desktop control row
 * rendered side by side with `md:hidden` / `hidden md:flex`, which mounted the
 * model picker, the attachment picker and their queries twice on every chat
 * page. This hook resolves the variant once from a media query and hands the
 * component a single prop bag.
 */
export function useMessageComposer(props: MessageComposerProps): UseMessageComposerReturn {
  const { t } = useTranslation();
  const planFeatures = usePlanFeatures();
  const isWideViewport = useMediaQuery(MEDIA_QUERY_LG_UP);
  const state = useMessageComposerState({
    onSend: props.onSend,
    isPending: props.isPending,
    selectedModel: props.selectedModel,
    // A composer with no thread yet (the new-chat surface) still gets a draft,
    // under a stable key, so a message typed before the thread exists survives
    // a refresh too.
    threadId: props.threadId ?? NEW_THREAD_DRAFT_KEY,
  });

  const hasContent = state.content.trim().length > 0;

  return {
    isPending: props.isPending,
    placeholder: t('chat.composerPlaceholder'),
    sendLabel: t('chat.sendMessage'),
    uploadingLabel: state.isUploadingAttachment ? t('chat.attachment.uploading') : null,
    validationError: state.validationError,
    canSubmit: !props.isPending && hasContent,
    content: state.content,
    minRows: COMPOSER_MIN_ROWS,
    maxRows: COMPOSER_MAX_ROWS,
    recallValue: props.recallValue,
    onValueChange: state.handleValueChange,
    onSubmitValue: state.submit,
    onFormSubmit: state.handleSubmit,
    onIngestFiles: state.ingestFiles,
    toolbarProps: {
      selectedModel: props.selectedModel,
      onModelChange: props.onModelChange,
      disabled: props.isPending,
      // Compact everywhere — the toolbar is meant to be the quiet part of the
      // composer. Only the model trigger keeps its label above `lg`, because a
      // user who cannot see which model is about to answer has to open a menu
      // to find out — and below `lg` there is no room for the label anyway.
      controlVariant: ComposerControlVariant.Compact,
      showModelLabel: isWideViewport,
      selectedFileIds: state.selectedFileIds,
      onSelectedFileIdsChange: state.setSelectedFileIds,
      canResearch: planFeatures.has(PlanFeature.ALLOW_RESEARCH_MODE),
      research: state.research,
      onResearchChange: state.setResearch,
      researchProviders: state.researchProviders,
      isResearchProvidersLoading: state.isResearchProvidersLoading,
      threadId: props.threadId ?? null,
      draft: state.content,
      showCredit: isWideViewport,
    },
  };
}
