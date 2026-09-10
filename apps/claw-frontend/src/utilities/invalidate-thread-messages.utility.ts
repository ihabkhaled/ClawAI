import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';

/**
 * Invalidates every cached view of one thread's messages.
 *
 * There are two, and they do not prefix-match each other:
 *
 * - `threads.messagesInfinite(id)` — `['threads','messages-infinite',id]`, what
 *   the thread page renders from.
 * - `threads.messages(id, page)` — `['threads','messages',id,page]`, what the
 *   ten orchestration poll hooks read.
 *
 * Send, regenerate and message-feedback each invalidated only
 * `threads.messages(id)` — with the page element `undefined`, which matches
 * neither the infinite key nor `[...,id,1]`. So the three mutations that change
 * a conversation invalidated **nothing**, and the list stayed fresh only
 * because a 2-second timer was re-fetching it. Removing that timer without
 * fixing this would have stopped the UI updating.
 *
 * Call this instead of hand-writing either key: one function is much harder to
 * get half-right than two invalidations at each call site.
 */
export function invalidateThreadMessages(queryClient: QueryClient, threadId: string): void {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.threads.messagesInfinite(threadId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.threads.messagesAnyPage(threadId),
  });
}
