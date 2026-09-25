import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import {
  COMPOSER_ATTACHMENT_CANCEL_PROCESSING_ARIA_KEY,
  COMPOSER_ATTACHMENT_CANCEL_PROCESSING_KEY,
  COMPOSER_ATTACHMENT_CANCELLING_KEY,
  COMPOSER_ATTACHMENT_LIST_LABEL_KEY,
} from '@/constants/composer-attachment.constants';
import { useFiles } from '@/hooks/files/use-files';
import { useTranslation } from '@/lib/i18n/use-translation';
import { filesRepository } from '@/repositories/files/files.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  ComposerAttachmentChip,
  ComposerProcessingCancel,
  UseComposerAttachmentChipsParams,
  UseComposerAttachmentChipsReturn,
} from '@/types/composer-attachment.types';
import {
  describeComposerAttachmentChip,
  resolveComposerAttachmentChips,
} from '@/utilities/composer-attachment.utility';
import { logger } from '@/utilities/logger.utility';

/**
 * The composer's per-attachment chips, with their copy resolved.
 *
 * Ingestion status comes from `useFiles()` — the SAME query (same key, same
 * cache) the paperclip picker already mounts, which polls only while a listed
 * file is PENDING / PROCESSING. No second poller is started here.
 *
 * Processing never blocks the send: chat-service waits for a bounded window
 * or tells the model the file is still processing. The chip only says so.
 *
 * A VIDEO still processing offers "Stop processing" (pack §72): one POST to
 * file-service, then the file list is refetched so the tile reads Cancelled.
 * The file stays attached and stored; removing it is a separate choice.
 */
export function useComposerAttachmentChips({
  selectedFileIds,
  onSelectedFileIdsChange,
  uploads,
  onDismissUpload,
}: UseComposerAttachmentChipsParams): UseComposerAttachmentChipsReturn {
  const { t } = useTranslation();
  const { files } = useFiles();
  const queryClient = useQueryClient();
  const [cancellingIds, setCancellingIds] = useState<ReadonlySet<string>>(new Set());
  const { mutate: cancelProcessing } = useMutation({
    mutationFn: (fileId: string) => filesRepository.cancelProcessing(fileId),
    onMutate: (fileId: string) => {
      setCancellingIds((current) => new Set([...current, fileId]));
    },
    onSettled: (_result, error, fileId: string) => {
      setCancellingIds((current) => new Set([...current].filter((id) => id !== fileId)));
      if (error !== null) {
        logger.warn({
          component: 'chat',
          action: 'video-processing-cancel-failed',
          message: 'Stopping video processing failed',
          details: { fileId },
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.files.lists() });
    },
  });

  const chips = useMemo(
    (): ComposerAttachmentChip[] =>
      resolveComposerAttachmentChips({ selectedFileIds, uploads, files }).map((draft) =>
        describeComposerAttachmentChip(draft, t),
      ),
    [files, selectedFileIds, t, uploads],
  );

  const onRemove = useCallback(
    (chip: ComposerAttachmentChip): void => {
      if (chip.fileId !== null) {
        onSelectedFileIdsChange(selectedFileIds.filter((id) => id !== chip.fileId));
      }
      if (chip.localId !== null) {
        onDismissUpload(chip.localId);
      }
    },
    [onDismissUpload, onSelectedFileIdsChange, selectedFileIds],
  );

  const processingCancelByFileId = useMemo(
    (): ReadonlyMap<string, ComposerProcessingCancel> =>
      new Map(
        chips.flatMap((chip) => {
          const fileId = chip.fileId;
          if (fileId === null || !chip.canCancelProcessing) {
            return [];
          }
          const isCancelling = cancellingIds.has(fileId);
          const cancel: ComposerProcessingCancel = {
            label: t(
              isCancelling
                ? COMPOSER_ATTACHMENT_CANCELLING_KEY
                : COMPOSER_ATTACHMENT_CANCEL_PROCESSING_KEY,
            ),
            ariaLabel: t(COMPOSER_ATTACHMENT_CANCEL_PROCESSING_ARIA_KEY, {
              name: chip.displayName,
            }),
            isCancelling,
            onCancel: () => {
              if (!cancellingIds.has(fileId)) {
                cancelProcessing(fileId);
              }
            },
          };
          return [[fileId, cancel] as const];
        }),
      ),
    [cancelProcessing, cancellingIds, chips, t],
  );

  return {
    chips,
    listLabel: t(COMPOSER_ATTACHMENT_LIST_LABEL_KEY),
    onRemove,
    processingCancelByFileId,
  };
}
