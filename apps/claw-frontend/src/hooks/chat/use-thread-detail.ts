import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { POLLING_INTERVAL_MS } from '@/constants';
import { MessageRole } from '@/enums';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';

export function useThreadDetail(threadId: string) {
  const queryClient = useQueryClient();
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageCountBeforeSend = useRef(0);

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

  const messagesList = messagesQuery.data?.data ?? [];
  const lastMessage = messagesList.length > 0 ? messagesList[messagesList.length - 1] : undefined;

  // Manual polling via setInterval for reliable auto-fetch
  useEffect(() => {
    if (isWaitingForResponse && threadId) {
      // Start polling
      pollingRef.current = setInterval(() => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.threads.messages(threadId),
        });
      }, POLLING_INTERVAL_MS);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isWaitingForResponse, threadId, queryClient]);

  // Stop polling when a new assistant message arrives
  useEffect(() => {
    if (!isWaitingForResponse) {
      return;
    }

    // Check if we got a new ASSISTANT message since we started waiting
    const hasNewAssistantMessage =
      lastMessage?.role === MessageRole.ASSISTANT &&
      messagesList.length > messageCountBeforeSend.current;

    if (hasNewAssistantMessage) {
      setIsWaitingForResponse(false);
      // Also refetch the thread to update lastProvider/lastModel
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.detail(threadId),
      });
    }
  }, [isWaitingForResponse, lastMessage?.role, messagesList.length, threadId, queryClient]);

  const startWaitingForResponse = useCallback((): void => {
    messageCountBeforeSend.current = messagesList.length;
    setIsWaitingForResponse(true);
  }, [messagesList.length]);

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
