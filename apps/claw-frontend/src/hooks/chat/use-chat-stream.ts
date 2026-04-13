import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL } from '@/constants';
import { FallbackFailureType, StreamEventType } from '@/enums';
import type { FallbackAttemptInfo, SseConnection, StreamEvent } from '@/types';
import { connectSse, logger } from '@/utilities';

export function useChatStream(threadId: string, isActive: boolean) {
  const [fallbackAttempts, setFallbackAttempts] = useState<FallbackAttemptInfo[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [judgeEvaluating, setJudgeEvaluating] = useState(false);
  const [executingModel, setExecutingModel] = useState<string | null>(null);
  const [judgeModel, setJudgeModel] = useState<string | null>(null);
  const connectionRef = useRef<SseConnection | null>(null);

  const resetStream = useCallback((): void => {
    setFallbackAttempts([]);
    setStreamError(null);
    setJudgeEvaluating(false);
    setExecutingModel(null);
    setJudgeModel(null);
  }, []);

  useEffect(() => {
    if (!isActive || !threadId) {
      return;
    }

    resetStream();

    const url = `${API_BASE_URL}/chat-messages/stream/${threadId}`;

    logger.debug({
      component: 'chat',
      action: 'sse-connect',
      message: 'Connecting to SSE stream',
      details: { threadId },
    });

    const connection = connectSse(url, {
      onMessage: (data: string) => {
        try {
          const parsed = JSON.parse(data) as StreamEvent;

          if (parsed.type === StreamEventType.FALLBACK_ATTEMPT) {
            logger.warn({
              component: 'chat',
              action: 'fallback-attempt',
              message: 'Provider fallback triggered',
              details: {
                threadId,
                failedProvider: parsed.failedProvider,
                nextProvider: parsed.nextProvider,
              },
            });
            const errorText = parsed.error ?? 'Unknown error';
            const attempt: FallbackAttemptInfo = {
              failedProvider: parsed.failedProvider ?? 'unknown',
              failedModel: parsed.failedModel ?? 'unknown',
              error: errorText,
              attempt: parsed.attempt ?? 0,
              totalCandidates: parsed.totalCandidates ?? 0,
              nextProvider: parsed.nextProvider,
              nextModel: parsed.nextModel,
              timestamp: Date.now(),
              failureType: errorText.startsWith('Weak response') ? FallbackFailureType.QUALITY : FallbackFailureType.ERROR,
            };
            setFallbackAttempts((prev) => [...prev, attempt]);
          }

          if (parsed.type === StreamEventType.PROVIDER_SELECTED) {
            const label =
              parsed.provider && parsed.model ? `${parsed.provider} / ${parsed.model}` : null;
            setExecutingModel(label);
          }

          if (parsed.type === StreamEventType.JUDGE_EVALUATING) {
            logger.info({
              component: 'chat',
              action: 'judge-evaluating',
              message: 'Judge-referee pipeline started',
              details: { threadId, criticModel: parsed.criticModel, judgeModel: parsed.judgeModel },
            });
            setJudgeEvaluating(true);
            if (parsed.judgeModel) {
              setJudgeModel(parsed.judgeModel);
            }
          }

          if (parsed.type === StreamEventType.DONE) {
            setJudgeEvaluating(false);
            setExecutingModel(null);
            setJudgeModel(null);
          }

          if (parsed.type === StreamEventType.ERROR) {
            logger.error({
              component: 'chat',
              action: 'stream-error',
              message: 'Stream error received',
              details: { threadId, error: parsed.error },
            });
            setStreamError(parsed.error ?? 'All providers failed');
          }
        } catch {
          // Ignore parse errors from SSE heartbeats
        }
      },
      onError: () => {
        logger.warn({
          component: 'chat',
          action: 'sse-connection-error',
          message: 'SSE connection error, falling back to polling',
          details: { threadId },
        });
      },
    });

    connectionRef.current = connection;

    return () => {
      connection.close();
      connectionRef.current = null;
    };
  }, [threadId, isActive, resetStream]);

  // Clean up when no longer waiting
  useEffect(() => {
    if (!isActive && connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }
  }, [isActive]);

  return {
    fallbackAttempts,
    streamError,
    judgeEvaluating,
    executingModel,
    judgeModel,
    resetStream,
  };
}
