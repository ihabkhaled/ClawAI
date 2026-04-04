import { useQuery } from "@tanstack/react-query";

import { chatRepository } from "@/repositories/chat/chat.repository";
import { queryKeys } from "@/repositories/shared/query-keys";

export function useThreadDetail(threadId: string) {
  const threadQuery = useQuery({
    queryKey: queryKeys.threads.detail(threadId),
    queryFn: () => chatRepository.getThread(threadId),
    enabled: !!threadId,
  });

  const messagesQuery = useQuery({
    queryKey: queryKeys.threads.messages(threadId),
    queryFn: () => chatRepository.getMessages(threadId),
    enabled: !!threadId,
  });

  return {
    thread: threadQuery.data ?? null,
    messages: messagesQuery.data?.data ?? [],
    isLoadingThread: threadQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading,
    isError: threadQuery.isError || messagesQuery.isError,
    error: threadQuery.error ?? messagesQuery.error,
    refetchMessages: messagesQuery.refetch,
  };
}
