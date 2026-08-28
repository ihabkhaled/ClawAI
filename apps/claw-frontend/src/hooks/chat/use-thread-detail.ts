import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { POLLING_INTERVAL_MS, POLLING_MAX_TICKS } from '@/constants';
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
  const waitingSuppressedRef = useRef(false);

  const threadQuery = useQuery({
    queryKey: queryKeys.threads.detail(threadId),
    queryFn: () => {
      logger.debug({
        component: 'chat',
        action: 'fetch-thread-start',
        message: 'Fetching thread detail',
        details: { threadId },
      });
      return chatRepository.getThread(threadId);
    },
    enabled: !!threadId,
  });

  const virtualizedMessages = useVirtualizedMessages(threadId, isWaitingForResponse);

  const messagesList = virtualizedMessages.messages;
  const lastMessage = messagesList.length > 0 ? messagesList.at(-1) : undefined;

  const {
    fallbackAttempts,
    streamCompletedAt,
    streamError,
    judgeEvaluating,
    executingModel,
    judgeModel,
    progressStages,
    currentStageLabel,
    streamLive,
    resetStream,
  } = useChatStream(threadId, isWaitingForResponse);

  // A completed stream refetches immediately instead of waiting for the next
  // poll tick. Without this the answer was already stored and streamed, but the
  // page kept showing the in-flight state until a poll happened to land — or
  // until the user refreshed, which is how this was reported.
  useEffect(() => {
    if (streamCompletedAt === null || !isWaitingForResponse) {
      return;
    }
    void queryClient.invalidateQueries({
      queryKey: queryKeys.threads.messagesInfinite(threadId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.threads.detail(threadId),
    });
    // DONE is the authoritative end of the run, so it must also end the waiting
    // state. Leaving that to the message-count effect below is not equivalent:
    // that effect compares against the count captured when the message was
    // sent, and on a thread that already fills a page the count does not grow,
    // so the spinner and the three-minute poll would keep running after the
    // answer had already rendered.
    waitingSuppressedRef.current = true;
    setIsWaitingForResponse(false);
  }, [streamCompletedAt, isWaitingForResponse, queryClient, threadId]);

  // When SSE reports an error, immediately refetch messages and stop polling.
  // The backend stores an error ASSISTANT message, so the refetch will pick it up.
  useEffect(() => {
    if (streamError && isWaitingForResponse) {
      logger.warn({
        component: 'chat',
        action: 'stream-error',
        message: 'SSE stream error received',
        details: { threadId, streamError },
      });
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
        if (pollCount > POLLING_MAX_TICKS) {
          logger.warn({
            component: 'chat',
            action: 'polling-timeout',
            message: 'Polling max reached, stopping',
            details: { threadId, ticks: pollCount },
          });
          // One last refetch on the way out. The answer may have landed between
          // the previous tick and this one, and giving up without looking is
          // how a completed run ends with the page still showing the in-flight
          // state until something else happens to refetch.
          void queryClient.invalidateQueries({
            queryKey: queryKeys.threads.messagesInfinite(threadId),
          });
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
      logger.info({
        component: 'chat',
        action: 'response-received',
        message: 'Assistant response received',
        details: { threadId, messageCount: messagesList.length },
      });
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
      !waitingSuppressedRef.current &&
      messagesList.length > 0 &&
      lastMessage?.role === MessageRole.USER &&
      !virtualizedMessages.isLoading
    ) {
      messageCountBeforeSend.current = messagesList.length - 1;
      setIsWaitingForResponse(true);
    }
  }, [messagesList.length, lastMessage?.role, virtualizedMessages.isLoading, isWaitingForResponse]);

  const startWaitingForResponse = useCallback((): void => {
    logger.debug({
      component: 'chat',
      action: 'waiting-for-response',
      message: 'Started waiting for AI response',
      details: { threadId, currentMessageCount: messagesList.length },
    });
    messageCountBeforeSend.current = messagesList.length;
    waitingSuppressedRef.current = false;
    resetStream();
    setIsWaitingForResponse(true);
  }, [messagesList.length, resetStream, threadId]);

  const stopWaitingForResponse = useCallback((): void => {
    waitingSuppressedRef.current = true;
    setIsWaitingForResponse(false);
  }, []);

  return {
    thread: threadQuery.data ?? null,
    messages: messagesList,
    isLoadingThread: threadQuery.isLoading,
    isLoadingMessages: virtualizedMessages.isLoading,
    isError: threadQuery.isError,
    error: threadQuery.error ?? null,
    isWaitingForResponse,
    startWaitingForResponse,
    stopWaitingForResponse,
    fallbackAttempts,
    streamError,
    judgeEvaluating,
    executingModel,
    judgeModel,
    progressStages,
    currentStageLabel,
    streamLive,
    virtualizedMessages,
  };
}
