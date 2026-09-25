import { useCallback, useMemo } from 'react';

import { COMPOSER_ATTACHMENT_LIST_LABEL_KEY } from '@/constants/composer-attachment.constants';
import { useFiles } from '@/hooks/files/use-files';
import { useTranslation } from '@/lib/i18n/use-translation';
import type {
  ComposerAttachmentChip,
  UseComposerAttachmentChipsParams,
  UseComposerAttachmentChipsReturn,
} from '@/types/composer-attachment.types';
import {
  describeComposerAttachmentChip,
  resolveComposerAttachmentChips,
} from '@/utilities/composer-attachment.utility';

/**
 * The composer's per-attachment chips, with their copy resolved.
 *
 * Ingestion status comes from `useFiles()` — the SAME query (same key, same
 * cache) the paperclip picker already mounts, which polls only while a listed
 * file is PENDING / PROCESSING. No second poller is started here.
 *
 * Processing never blocks the send: chat-service waits for a bounded window
 * or tells the model the file is still processing. The chip only says so.
 */
export function useComposerAttachmentChips({
  selectedFileIds,
  onSelectedFileIdsChange,
  uploads,
  onDismissUpload,
}: UseComposerAttachmentChipsParams): UseComposerAttachmentChipsReturn {
  const { t } = useTranslation();
  const { files } = useFiles();

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

  return { chips, listLabel: t(COMPOSER_ATTACHMENT_LIST_LABEL_KEY), onRemove };
}
