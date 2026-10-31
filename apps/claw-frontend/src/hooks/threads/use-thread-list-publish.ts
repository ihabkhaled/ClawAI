import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { THREAD_LIST_QUERY_KEY_BASE } from '@/constants/thread-list.constants';
import { ThreadListStatus } from '@/enums/thread-list-status.enum';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadErrorMessage } from '@/types/thread-generation-progress.types';
import type { ThreadListItem, ThreadListPage } from '@/types/thread-list.types';
import { resolveThreadErrorMessage } from '@/utilities/thread-error-message.utility';

/** Publish one row. On success the row flips to Published in the cache, with no full reload. */
export function useThreadListPublish(): {
  publishingId: string | null;
  error: { id: string; message: ThreadErrorMessage } | null;
  publish: (item: ThreadListItem) => void;
} {
  const queryClient = useQueryClient();
  const [error, setError] = useState<{ id: string; message: ThreadErrorMessage } | null>(null);
  const mutation = useMutation({
    mutationFn: (item: ThreadListItem) => threadPublicationsRepository.publish(item.id),
    onMutate: () => setError(null),
    onSuccess: async (_result, item) => {
      const publishedAt = new Date().toISOString();
      queryClient.setQueriesData<ThreadListPage>(
        { queryKey: [...THREAD_LIST_QUERY_KEY_BASE, 'page'] },
        (page) =>
          page === undefined
            ? page
            : {
                ...page,
                items: page.items.map((row) =>
                  row.id === item.id
                    ? {
                        ...row,
                        status: ThreadListStatus.PUBLISHED as const,
                        publishedAt,
                        canPublish: false,
                      }
                    : row,
                ),
              },
      );
      await queryClient.invalidateQueries({ queryKey: THREAD_LIST_QUERY_KEY_BASE });
    },
    onError: (failure, item) =>
      setError({ id: item.id, message: resolveThreadErrorMessage(failure) }),
  });
  return {
    publishingId: mutation.isPending ? (mutation.variables?.id ?? null) : null,
    error,
    publish: (item) => mutation.mutate(item),
  };
}
