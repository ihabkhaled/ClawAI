import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL, PROGRESS_EVENT_TYPES } from '@/constants';
import { FallbackFailureType, StreamEventType, VisibleProgressStageStatus } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import type {
  FallbackAttemptInfo,
  SseConnection,
  StreamEvent,
  StreamLiveState,
  VisibleProgressStage,
} from '@/types';
import { connectSse, logger } from '@/utilities';
import { resolveChatStreamError } from '@/utilities/chat-stream-error.utility';

export function useChatStream(threadId: string, isActive: boolean) {
  const { t } = useTranslation();
  const [fallbackAttempts, setFallbackAttempts] = useState<FallbackAttemptInfo[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [judgeEvaluating, setJudgeEvaluating] = useState(false);
  const [executingModel, setExecutingModel] = useState<string | null>(null);
  const [judgeModel, setJudgeModel] = useState<string | null>(null);
  const [progressStages, setProgressStages] = useState<VisibleProgressStage[]>([]);
  const [currentStageLabel, setCurrentStageLabel] = useState<string | null>(null);
  const [streamLive, setStreamLive] = useState<StreamLiveState>({
    content: '',
    reasoning: '',
    isStreaming: false,
  });
  const connectionRef = useRef<SseConnection | null>(null);
  // Content/reasoning arrive token-by-token; buffer in refs and flush to state
  // on the throttled METRICS events to avoid one React render per token.
  const contentRef = useRef('');
  const reasoningRef = useRef('');

  const resetStream = useCallback((): void => {
    setFallbackAttempts([]);
    setStreamError(null);
    setJudgeEvaluating(false);
    setExecutingModel(null);
    setJudgeModel(null);
    setProgressStages([]);
    setCurrentStageLabel(null);
    contentRef.current = '';
    reasoningRef.current = '';
    setStreamLive({ content: '', reasoning: '', isStreaming: false });
  }, []);

  const flushLive = useCallback((event: StreamEvent, isStreaming: boolean): void => {
    setStreamLive((prev) => ({
      content: contentRef.current,
      reasoning: reasoningRef.current,
      reasoningVisibility: event.reasoningVisibility ?? prev.reasoningVisibility,
      stage: event.stage ?? prev.stage,
      metrics: event.metrics ?? prev.metrics,
      usage: event.usage ?? prev.usage,
      isStreaming,
    }));
  }, []);

  const upsertStage = useCallback((event: StreamEvent, status: VisibleProgressStage['status']) => {
    const actorKey = event.model ?? event.actorName ?? event.provider ?? event.type;
    const stageId = event.stageId ?? `${event.type}:${actorKey}`;
    const nextStage: VisibleProgressStage = {
      id: stageId,
      type: event.type,
      label: event.label ?? event.type,
      description: event.description,
      actorType: event.actorType,
      actorName: event.actorName,
      provider: event.provider,
      model: event.model,
      status,
      timestamp: Date.now(),
      sequence: event.sequence,
      createdAt: event.createdAt,
    };

    setProgressStages((prev) => {
      const existingIndex = prev.findIndex((stage) => stage.id === stageId);
      if (existingIndex === -1) {
        return [...prev, nextStage];
      }

      const updated = [...prev];
      updated[existingIndex] = nextStage;
      return updated;
    });
    setCurrentStageLabel(nextStage.label);
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

          if (PROGRESS_EVENT_TYPES.has(parsed.type)) {
            upsertStage(parsed, parsed.status ?? VisibleProgressStageStatus.ACTIVE);
          }

          if (parsed.type === StreamEventType.CONTENT_DELTA) {
            contentRef.current += parsed.delta ?? '';
          }

          if (parsed.type === StreamEventType.REASONING_DELTA) {
            reasoningRef.current += parsed.reasoningDelta ?? '';
            flushLive(parsed, true);
          }

          if (
            parsed.type === StreamEventType.LIFECYCLE ||
            parsed.type === StreamEventType.METRICS ||
            parsed.type === StreamEventType.USAGE
          ) {
            flushLive(parsed, true);
          }

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
              failureType: errorText.startsWith('Weak response')
                ? FallbackFailureType.QUALITY
                : FallbackFailureType.ERROR,
            };
            setFallbackAttempts((prev) => [...prev, attempt]);
            upsertStage(parsed, VisibleProgressStageStatus.ACTIVE);
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
            upsertStage(parsed, VisibleProgressStageStatus.ACTIVE);
          }

          if (parsed.type === StreamEventType.DONE) {
            setJudgeEvaluating(false);
            setExecutingModel(null);
            setJudgeModel(null);
            flushLive(parsed, false);
            upsertStage(parsed, VisibleProgressStageStatus.COMPLETED);
          }

          if (parsed.type === StreamEventType.ERROR) {
            const localizedError = resolveChatStreamError(parsed, t);
            logger.error({
              component: 'chat',
              action: 'stream-error',
              message: 'Stream error received',
              details: {
                threadId,
                code: parsed.code,
                messageKey: parsed.messageKey,
              },
            });
            setStreamError(localizedError);
            flushLive(parsed, false);
            upsertStage(
              { ...parsed, description: localizedError },
              VisibleProgressStageStatus.ERROR,
            );
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
  }, [threadId, isActive, resetStream, upsertStage, flushLive, t]);

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
    progressStages,
    currentStageLabel,
    streamLive,
    resetStream,
  };
}
