import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import type { LiveExportFormat } from '@/enums/live.enum';
import { useTranslation } from '@/lib/i18n';
import { liveRepository } from '@/repositories/live/live.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseLiveHistoryActionsResult } from '@/types/live.types';
import { showToast } from '@/utilities';
import { saveBlobDownload } from '@/utilities/file-download.utility';
import { liveExportFilename } from '@/utilities/live-request.utility';

/** Delete one / delete all (confirmed first) and export, with a per-row pending id. */
export function useLiveHistoryActions(): UseLiveHistoryActionsResult {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const remove = useMutation({
    mutationFn: (id: string | null) =>
      id === null ? liveRepository.deleteAllHistory() : liveRepository.deleteHistoryItem(id),
    onSuccess: () => {
      showToast.success({ description: t('live.history.deleted') });
      void client.invalidateQueries({ queryKey: queryKeys.live.all });
    },
    onError: (error: Error) => showToast.apiError(error, t('live.history.deleteError')),
    onSettled: () => {
      setConfirmDeleteId(null);
      setConfirmDeleteAll(false);
    },
  });
  const exporter = useMutation({
    mutationFn: async (value: { id: string; format: LiveExportFormat }) => {
      setPendingId(value.id);
      const blob = await liveRepository.exportHistory(value.id, { format: value.format });
      saveBlobDownload(blob, liveExportFilename(value.id, value.format));
    },
    onError: (error: Error) => showToast.apiError(error, t('live.history.exportError')),
    onSettled: () => setPendingId(null),
  });
  const { mutate: removeMutate } = remove;
  const { mutate: exportMutate } = exporter;
  const confirmDelete = useCallback((): void => {
    removeMutate(confirmDeleteAll ? null : confirmDeleteId);
  }, [confirmDeleteAll, confirmDeleteId, removeMutate]);

  return {
    pendingId: remove.isPending ? (remove.variables ?? null) : pendingId,
    confirmDeleteId,
    confirmDeleteAll,
    isDeleting: remove.isPending,
    askDelete: setConfirmDeleteId,
    askDeleteAll: () => setConfirmDeleteAll(true),
    cancelDelete: () => {
      setConfirmDeleteId(null);
      setConfirmDeleteAll(false);
    },
    confirmDelete,
    exportHistory: (id, format) => exportMutate({ id, format }),
  };
}
