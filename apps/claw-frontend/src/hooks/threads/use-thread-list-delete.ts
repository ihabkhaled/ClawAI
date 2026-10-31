import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { THREAD_LIST_QUERY_KEY_BASE } from '@/constants/thread-list.constants';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadDeleteController } from '@/types/thread-generation-progress.types';
import type { ThreadListItem } from '@/types/thread-list.types';
import { resolveThreadErrorMessage } from '@/utilities/thread-error-message.utility';

/**
 * Delete from the list behind a confirm dialog (same controller shape as the review page).
 * `onDeleted` runs after success so the page can step back when the last row of a page went.
 * When the dialog closes, focus returns to the row button, or to `fallbackFocus` when that row is gone.
 */
export function useThreadListDelete(
  onDeleted: () => void,
  fallbackFocus: () => HTMLElement | null,
): {
  remove: ThreadDeleteController;
  ask: (item: ThreadListItem) => void;
} {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<ThreadListItem | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const mutation = useMutation({
    mutationFn: (item: ThreadListItem) => threadPublicationsRepository.deletePublication(item.id),
    onSuccess: async () => {
      setTarget(null);
      onDeleted();
      await queryClient.invalidateQueries({ queryKey: THREAD_LIST_QUERY_KEY_BASE });
    },
  });
  const remove: ThreadDeleteController = {
    isOpen: target !== null,
    setOpen: (value) => {
      if (!value) {
        setTarget(null);
      }
    },
    confirm: () => {
      if (target !== null) {
        mutation.mutate(target);
      }
    },
    isDeleting: mutation.isPending,
    error: mutation.isError ? resolveThreadErrorMessage(mutation.error) : null,
    onCloseAutoFocus: (event) => {
      event.preventDefault();
      const element = trigger.current?.isConnected ? trigger.current : fallbackFocus();
      element?.focus({ preventScroll: true });
    },
  };
  return {
    remove,
    ask: (item) => {
      mutation.reset();
      trigger.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setTarget(item);
    },
  };
}
