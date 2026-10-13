import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ROUTES } from '@/constants/routes.constants';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadDeleteController } from '@/types/thread-generation-progress.types';
import { resolveThreadErrorMessage } from '@/utilities/thread-error-message.utility';

/** Owner deletes a Thread that is not published, then returns to the list. */
export function useThreadDeleteAction(publicationId: string): ThreadDeleteController {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () => threadPublicationsRepository.deletePublication(publicationId),
    onSuccess: async () => {
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
      router.push(ROUTES.THREAD_PUBLICATIONS);
    },
  });

  return {
    isOpen,
    setOpen: (value) => {
      if (value) {
        mutation.reset();
      }
      setOpen(value);
    },
    confirm: () => mutation.mutate(),
    isDeleting: mutation.isPending,
    error: mutation.isError ? resolveThreadErrorMessage(mutation.error) : null,
  };
}
