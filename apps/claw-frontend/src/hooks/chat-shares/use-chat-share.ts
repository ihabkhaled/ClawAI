import { useQuery } from '@tanstack/react-query';

import { CHAT_SHARE_STALE_MS } from '@/constants/chat-share.constants';
import { chatSharesRepository } from '@/repositories/chat-shares/chat-shares.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseChatShareQueryReturn } from '@/types/chat-share-hook.types';

/**
 * Reads the current share state for a thread.
 *
 * `null` is the normal answer for a thread that was never shared and is NOT an
 * error — rendering an error for it would tell every owner of a private chat
 * that sharing is broken.
 *
 * Only enabled once a thread id exists, so the compare view (which has no thread
 * of its own) does not fire a request for `undefined`.
 */
export function useChatShare(threadId: string | null): UseChatShareQueryReturn {
  const query = useQuery({
    queryKey: queryKeys.chatShares.detail(threadId ?? ''),
    queryFn: () => chatSharesRepository.get(threadId as string),
    enabled: threadId !== null && threadId.length > 0,
    staleTime: CHAT_SHARE_STALE_MS,
  });

  return {
    share: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
