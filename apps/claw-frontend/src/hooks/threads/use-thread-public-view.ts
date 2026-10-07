import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { PublicThreadPublication } from '@/types/thread-publication.types';

/** Counts this visit once per page load, then shows the fresh totals. A failure is silent. */
export function useThreadPublicView(slug: string, isAuthenticated: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (slug === '') {
      return;
    }
    let isCurrent = true;
    threadPublicationsRepository
      .recordPublicView(slug, isAuthenticated)
      .then((counts) => {
        if (!isCurrent) {
          return;
        }
        queryClient.setQueryData<PublicThreadPublication>(
          ['thread-publications', 'public', slug],
          (current) => (current ? { ...current, ...counts } : current),
        );
      })
      .catch(() => undefined);
    return (): void => {
      isCurrent = false;
    };
  }, [slug, isAuthenticated, queryClient]);
}
