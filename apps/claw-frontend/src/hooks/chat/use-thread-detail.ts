import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { POLLING_INTERVAL_MS } from '@/constants';
import { MessageRole } from '@/enums';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

export function useThreadDetail(threadId: string) {
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  const threadQuery = useQuery({
    queryKey: queryKeys.threads.detail(threadId),
    queryFn: () => chatRepository.getThread(threadId),
    enabled: !!threadId,
  });

  const messagesQuery = useQuery({
    queryKey: queryKeys.threads.messages(threadId),
    queryFn: () => chatRepository.getMessages(threadId),
    enabled: !!threadId,
    refetchInterval: isWaitingForResponse ? POLLING_INTERVAL_MS : false,
  });

  const messagesList = messagesQuery.data?.data ?? [];
  const lastMessage = messagesList.length > 0 ? messagesList[messagesList.length - 1] : null;

  // Stop polling when an assistant message arrives
  useEffect(() => {
    if (isWaitingForResponse && lastMessage?.role === MessageRole.ASSISTANT) {
      setIsWaitingForResponse(false);
    }
  }, [isWaitingForResponse, lastMessage?.role]);

  const startWaitingForResponse = (): void => {
    setIsWaitingForResponse(true);
  };

  return {
    thread: threadQuery.data ?? null,
    messages: messagesList,
    isLoadingThread: threadQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading,
    isError: threadQuery.isError || messagesQuery.isError,
    error: threadQuery.error ?? messagesQuery.error,
    refetchMessages: messagesQuery.refetch,
    isWaitingForResponse,
    startWaitingForResponse,
  };
}
