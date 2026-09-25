'use client';

import { useMemo } from 'react';

import {
  COMPOSER_MAX_ROWS,
  COMPOSER_MIN_ROWS,
  NEW_THREAD_DRAFT_KEY,
} from '@/constants/chat.constants';
import { MEDIA_QUERY_LG_UP } from '@/constants/media-query.constants';
import { ComposerControlVariant, PlanFeature } from '@/enums';
import { ComposerAttachmentState } from '@/enums/composer-attachment-state.enum';
import { usePlanFeatures } from '@/hooks/auth/use-plan-features';
import { useComposerAttachmentChips } from '@/hooks/chat/use-composer-attachment-chips';
import { useMessageComposerState } from '@/hooks/chat/use-message-composer-state';
import { useModelMediaCapabilities } from '@/hooks/chat/use-model-media-capabilities';
import { useRegisterComposerDropTarget } from '@/hooks/chat/use-register-composer-drop-target';
import { useMediaQuery } from '@/hooks/ui/use-media-query';
import { useTranslation } from '@/lib/i18n';
import type { MessageComposerProps, UseMessageComposerReturn } from '@/types';
import { hasSendableInput } from '@/utilities/composer-send.utility';

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
  const mediaCapabilities = useModelMediaCapabilities();
  const state = useMessageComposerState({
    onSend: props.onSend,
    isPending: props.isPending,
    selectedModel: props.selectedModel,
    // A composer with no thread yet (the new-chat surface) still gets a draft,
    // under a stable key, so a message typed before the thread exists survives
    // a refresh too.
    threadId: props.threadId ?? NEW_THREAD_DRAFT_KEY,
  });

  const chipState = useComposerAttachmentChips({
    selectedFileIds: state.selectedFileIds,
    onSelectedFileIdsChange: state.setSelectedFileIds,
    uploads: state.attachmentUploads,
    onDismissUpload: state.dismissAttachmentUpload,
  });
  // One list per file. Selected files render as tray tiles (preview + remove)
  // with the chip's state line; the chip strip keeps only uploads that never
  // got an id — failed or not supported. In-flight uploads are tray tiles.
  const attachmentChips = useMemo(
    () => ({
      listLabel: chipState.listLabel,
      onRemove: chipState.onRemove,
      chips: chipState.chips.filter(
        (chip) => chip.fileId === null && chip.state !== ComposerAttachmentState.Uploading,
      ),
    }),
    [chipState],
  );
  const statusByFileId = useMemo(
    () =>
      new Map(
        chipState.chips.flatMap((chip) =>
          chip.fileId === null || chip.note === null
            ? []
            : [[chip.fileId, `${chip.stateLabel} — ${chip.note}`] as const],
        ),
      ),
    [chipState],
  );

  // A whole-panel drop lands here: the thread panel reads this composer's
  // ingest function from the drop-target store.
  useRegisterComposerDropTarget(state.ingestFiles);

  // Words or files. Still refused while an upload is in flight — that guard
  // lives in validateAndSend, which both Enter and the button go through.
  const hasSendable = hasSendableInput(state.content, state.selectedFileIds.length);

  return {
    isPending: props.isPending,
    placeholder: t('chat.composerPlaceholder'),
    sendLabel: t('chat.sendMessage'),
    uploadingLabel: state.isUploadingAttachment ? t('chat.attachment.uploading') : null,
    uploadProgress: state.attachmentUploadProgress,
    validationError: state.validationError,
    canSubmit: !props.isPending && hasSendable && !state.isUploadingAttachment,
    content: state.content,
    minRows: COMPOSER_MIN_ROWS,
    maxRows: COMPOSER_MAX_ROWS,
    recallHistory: props.recallHistory,
    onValueChange: state.handleValueChange,
    onSubmitValue: state.submit,
    onFormSubmit: state.handleSubmit,
    onIngestFiles: state.ingestFiles,
    attachmentChips,
    attachmentTray: {
      fileIds: state.selectedFileIds,
      pendingUploads: state.pendingUploads,
      progress: state.attachmentUploadProgress,
      onRemove: state.removeAttachment,
      disabled: props.isPending,
      statusByFileId,
      processingCancelByFileId: chipState.processingCancelByFileId,
    },
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
      ingestFiles: state.ingestFiles,
      isUploadingAttachment: state.isUploadingAttachment,
      // A recorded note is an ordinary attachment: same upload pipeline
      // (antivirus, magic bytes), same selected list, same delivery.
      onRecorded: (file: File) => state.ingestFiles([file]),
      canSendAudio: mediaCapabilities.canSendAudio,
      canSendVideo: mediaCapabilities.canSendVideo,
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
