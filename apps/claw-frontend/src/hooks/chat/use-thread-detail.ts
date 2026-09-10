import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { RESPONSE_WAIT_TIMEOUT_MS } from '@/constants';
import { MessageRole } from '@/enums';
import { useChatStream } from '@/hooks/chat/use-chat-stream';
import { useVirtualizedMessages } from '@/hooks/chat/use-virtualized-messages';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { invalidateThreadMessages, logger } from '@/utilities';
import { buildTranscriptSignature } from '@/utilities/transcript-signature.utility';

export function useThreadDetail(threadId: string) {
  const queryClient = useQueryClient();
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const waitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageCountBeforeSend = useRef(0);
  /**
   * The transcript this hook has already opened a run for.
   *
   * Arming is idempotent per transcript signature, and that is the whole point.
   * The previous version compared against a signature computed from PRE-refetch
   * data, so it usually failed to match what arrived - and the completion
   * effect and the recovery effect below drove each other in a loop: a stale
   * replayed DONE cleared the waiting flag, which aborted the SSE connection,
   * which let the recovery effect see a USER-tailed transcript and set the flag
   * again. Each turn of that loop was one stream request that returned 200 and
   * died with an abort.
   *
   * Recording the signature at ARM time instead means a transcript that has
   * already been armed for is never armed for twice, so the loop cannot close.
   */
  const armedSignatureRef = useRef<string | null>(null);

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
    invalidateThreadMessages(queryClient, threadId);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.threads.detail(threadId),
    });
    // DONE is the authoritative end of the run, so it must also end the waiting
    // state. Leaving that to the message-count effect below is not equivalent:
    // that effect compares against the count captured when the message was
    // sent, and on a thread that already fills a page the count does not grow,
    // so the spinner and the three-minute poll would keep running after the
    // answer had already rendered.
    setIsWaitingForResponse(false);
  }, [
    streamCompletedAt,
    isWaitingForResponse,
    queryClient,
    threadId,
    messagesList.length,
    lastMessage?.id,
  ]);

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
      invalidateThreadMessages(queryClient, threadId);
    }
  }, [streamError, isWaitingForResponse, queryClient, threadId]);

  /**
   * The deadline on waiting, and the only timer left in this hook.
   *
   * There used to be a 2-second `setInterval` here invalidating the whole
   * conversation up to 300 times. It was doing two jobs badly: keeping the list
   * fresh (which the mutations now do correctly - they were invalidating a key
   * nothing queried) and bounding how long the page waits (which is this).
   *
   * The refetch while a response is in flight belongs to the query that owns
   * the data - `useVirtualizedMessages` runs it at MESSAGE_POLL_INTERVAL_MS -
   * so all that is left here is to stop waiting eventually.
   */
  useEffect(() => {
    if (!isWaitingForResponse || !threadId) {
      return;
    }
    waitTimeoutRef.current = setTimeout(() => {
      logger.warn({
        component: 'chat',
        action: 'response-wait-timeout',
        message: 'Stopped waiting for a response',
        details: { threadId, timeoutMs: RESPONSE_WAIT_TIMEOUT_MS },
      });
      // One last look before giving up: the answer may have landed since the
      // most recent refetch, and stopping without checking is how a completed
      // run leaves the page showing the in-flight state.
      invalidateThreadMessages(queryClient, threadId);
      setIsWaitingForResponse(false);
    }, RESPONSE_WAIT_TIMEOUT_MS);

    return () => {
      if (waitTimeoutRef.current) {
        clearTimeout(waitTimeoutRef.current);
        waitTimeoutRef.current = null;
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

  /**
   * Recovery: a transcript ending in a USER message means a run was started and
   * its answer has not arrived, so re-open the subscription after a reload.
   *
   * Guarded by the ARMED signature, not a suppression one. Without that guard
   * this effect and the completion effect above form the abort loop described
   * on `armedSignatureRef`.
   */
  useEffect(() => {
    const signature = buildTranscriptSignature(messagesList.length, lastMessage?.id ?? null);
    if (
      !isWaitingForResponse &&
      armedSignatureRef.current !== signature &&
      messagesList.length > 0 &&
      lastMessage?.role === MessageRole.USER &&
      !virtualizedMessages.isLoading
    ) {
      armedSignatureRef.current = signature;
      messageCountBeforeSend.current = messagesList.length - 1;
      setIsWaitingForResponse(true);
    }
  }, [
    messagesList.length,
    lastMessage?.role,
    lastMessage?.id,
    virtualizedMessages.isLoading,
    isWaitingForResponse,
  ]);

  const startWaitingForResponse = useCallback((): void => {
    logger.debug({
      component: 'chat',
      action: 'waiting-for-response',
      message: 'Started waiting for AI response',
      details: { threadId, currentMessageCount: messagesList.length },
    });
    messageCountBeforeSend.current = messagesList.length;
    // A send is an explicit new run, so it arms for the transcript as it stands
    // now. Clearing this instead would let the recovery effect arm a second
    // time for the same transcript the moment the flag is cleared.
    armedSignatureRef.current = buildTranscriptSignature(
      messagesList.length,
      lastMessage?.id ?? null,
    );
    resetStream();
    setIsWaitingForResponse(true);
  }, [messagesList.length, lastMessage?.id, resetStream, threadId]);

  const stopWaitingForResponse = useCallback((): void => {
    armedSignatureRef.current = buildTranscriptSignature(
      messagesList.length,
      lastMessage?.id ?? null,
    );
    setIsWaitingForResponse(false);
  }, [messagesList.length, lastMessage?.id]);

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
