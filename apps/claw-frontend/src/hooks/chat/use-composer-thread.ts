import { useQuery } from '@tanstack/react-query';

import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ChatThread } from '@/types';

/**
 * The thread behind the composer, read through the SAME query key the page
 * uses, so the three context controls add no request: they read what the page
 * already fetched and refresh when a thread update invalidates it.
 */
export function useComposerThread(threadId: string): ChatThread | null {
  const query = useQuery({
    queryKey: queryKeys.threads.detail(threadId),
    queryFn: () => chatRepository.getThread(threadId),
    enabled: threadId.length > 0,
  });
  return query.data ?? null;
}
