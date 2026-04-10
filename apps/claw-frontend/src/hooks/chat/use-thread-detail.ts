import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { POLLING_INTERVAL_MS } from '@/constants';
import { MessageRole } from '@/enums';
import { useChatStream } from '@/hooks/chat/use-chat-stream';
import { useVirtualizedMessages } from '@/hooks/chat/use-virtualized-messages';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { logger } from '@/utilities';

export function useThreadDetail(threadId: string) {
  const queryClient = useQueryClient();
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageCountBeforeSend = useRef(0);

  const threadQuery = useQuery({
    queryKey: queryKeys.threads.detail(threadId),
    queryFn: () => {
      logger.debug({ component: 'chat', action: 'fetch-thread-start', message: 'Fetching thread detail', details: { threadId } });
      return chatRepository.getThread(threadId);
    },
    enabled: !!threadId,
  });

  const virtualizedMessages = useVirtualizedMessages(threadId);

  const messagesList = virtualizedMessages.messages;
  const lastMessage = messagesList.length > 0 ? messagesList.at(-1) : undefined;

  const { fallbackAttempts, streamError, resetStream } = useChatStream(
    threadId,
    isWaitingForResponse,
  );

  // When SSE reports an error, immediately refetch messages and stop polling.
  // The backend stores an error ASSISTANT message, so the refetch will pick it up.
  useEffect(() => {
    if (streamError && isWaitingForResponse) {
      logger.warn({ component: 'chat', action: 'stream-error', message: 'SSE stream error received', details: { threadId, streamError } });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.messagesInfinite(threadId),
      });
    }
  }, [streamError, isWaitingForResponse, queryClient, threadId]);

  // Manual polling via setInterval for reliable auto-fetch (max 3 minutes)
  useEffect(() => {
    if (isWaitingForResponse && threadId) {
      let pollCount = 0;
      pollingRef.current = setInterval(() => {
        pollCount += 1;
        if (pollCount > 90) {
          logger.warn({ component: 'chat', action: 'polling-timeout', message: 'Polling max reached (3 min), stopping', details: { threadId } });
          setIsWaitingForResponse(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          return;
        }
        void queryClient.invalidateQueries({
          queryKey: queryKeys.threads.messagesInfinite(threadId),
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
      logger.info({ component: 'chat', action: 'response-received', message: 'Assistant response received', details: { threadId, messageCount: messagesList.length } });
      setIsWaitingForResponse(false);
      // Also refetch the thread to update lastProvider/lastModel
      void queryClient.invalidateQueries({
        queryKey: queryKeys.threads.detail(threadId),
      });
    }
  }, [isWaitingForResponse, lastMessage?.role, messagesList.length, threadId, queryClient]);

  // Auto-detect waiting state on page load/refresh:
  // If the last message is USER (no ASSISTANT reply yet), resume polling
  useEffect(() => {
    if (
      !isWaitingForResponse &&
      messagesList.length > 0 &&
      lastMessage?.role === MessageRole.USER &&
      !virtualizedMessages.isLoading
    ) {
      messageCountBeforeSend.current = messagesList.length - 1;
      setIsWaitingForResponse(true);
    }
  }, [messagesList.length, lastMessage?.role, virtualizedMessages.isLoading, isWaitingForResponse]);

  const startWaitingForResponse = useCallback((): void => {
    logger.debug({ component: 'chat', action: 'waiting-for-response', message: 'Started waiting for AI response', details: { threadId, currentMessageCount: messagesList.length } });
    messageCountBeforeSend.current = messagesList.length;
    resetStream();
    setIsWaitingForResponse(true);
  }, [messagesList.length, resetStream, threadId]);

  return {
    thread: threadQuery.data ?? null,
    messages: messagesList,
    isLoadingThread: threadQuery.isLoading,
    isLoadingMessages: virtualizedMessages.isLoading,
    isError: threadQuery.isError,
    error: threadQuery.error ?? null,
    isWaitingForResponse,
    startWaitingForResponse,
    fallbackAttempts,
    streamError,
    virtualizedMessages,
  };
}
