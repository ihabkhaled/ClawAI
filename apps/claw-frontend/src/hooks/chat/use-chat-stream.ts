import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL, PROCESSED_STREAM_EVENT_ID_CACHE_LIMIT } from '@/constants';
import { FallbackFailureType, StreamEventType, VisibleProgressStageStatus } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import type {
  FallbackAttemptInfo,
  LiveFlushStreamEvent,
  RouterProgressStageEvent,
  RouterStreamEvent,
  SseConnection,
  StreamLiveState,
  VisibleProgressStage,
} from '@/types';
import { connectSse, isSimpleProgressStreamEvent, logger } from '@/utilities';
import { resolveChatStreamError } from '@/utilities/chat-stream-error.utility';

export function useChatStream(threadId: string, isActive: boolean) {
  const { t } = useTranslation();
  const [fallbackAttempts, setFallbackAttempts] = useState<FallbackAttemptInfo[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [judgeEvaluating, setJudgeEvaluating] = useState(false);
  const [executingModel, setExecutingModel] = useState<string | null>(null);
  const [judgeModel, setJudgeModel] = useState<string | null>(null);
  const [progressStages, setProgressStages] = useState<VisibleProgressStage[]>([]);
  // The success path had no deterministic completion signal: the page waited
  // for a poll to happen to notice the assistant message, so a finished answer
  // could sit invisible until the user refreshed. DONE now stamps a value the
  // page can react to immediately, exactly as the error path already did.
  const [streamCompletedAt, setStreamCompletedAt] = useState<number | null>(null);
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
  // Mirrors progressStages synchronously so upsertStage can read the
  // just-applied stage (for the sequence guard below) and decide whether to
  // touch currentStageLabel without depending on React's setState-updater
  // timing, which does not run synchronously inside the same call.
  const progressStagesRef = useRef<VisibleProgressStage[]>([]);
  // Bounded set of SSE frame `eventId`s already applied — guards against a
  // durable-journal replay/resume redelivering a frame verbatim. Order is
  // insertion order (native Set semantics), so the oldest id is evicted once
  // the cache exceeds its cap.
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  const resetStream = useCallback((): void => {
    setFallbackAttempts([]);
    setStreamCompletedAt(null);
    setStreamError(null);
    setJudgeEvaluating(false);
    setExecutingModel(null);
    setJudgeModel(null);
    setProgressStages([]);
    setCurrentStageLabel(null);
    contentRef.current = '';
    reasoningRef.current = '';
    progressStagesRef.current = [];
    processedEventIdsRef.current = new Set();
    setStreamLive({ content: '', reasoning: '', isStreaming: false });
  }, []);

  const flushLive = useCallback((event: LiveFlushStreamEvent, isStreaming: boolean): void => {
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

  const settleActiveStages = useCallback((): void => {
    const next = progressStagesRef.current.map((stage) =>
      stage.status === VisibleProgressStageStatus.ACTIVE
        ? { ...stage, status: VisibleProgressStageStatus.COMPLETED }
        : stage,
    );
    progressStagesRef.current = next;
    setProgressStages(next);
  }, []);

  // Records a newly seen SSE frame eventId, evicting the oldest tracked id
  // once the bounded cache is full.
  const rememberProcessedEventId = useCallback((eventId: string): void => {
    processedEventIdsRef.current.add(eventId);
    if (processedEventIdsRef.current.size > PROCESSED_STREAM_EVENT_ID_CACHE_LIMIT) {
      const oldest = processedEventIdsRef.current.values().next().value;
      if (oldest !== undefined) {
        processedEventIdsRef.current.delete(oldest);
      }
    }
  }, []);

  const upsertStage = useCallback(
    (event: RouterProgressStageEvent, status: VisibleProgressStage['status']) => {
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

      const prev = progressStagesRef.current;
      const existingIndex = prev.findIndex((stage) => stage.id === stageId);

      if (existingIndex === -1) {
        const next = [...prev, nextStage];
        progressStagesRef.current = next;
        setProgressStages(next);
        setCurrentStageLabel(nextStage.label);
        return;
      }

      const existingStage = prev[existingIndex];
      const isStaleFrame =
        existingStage !== undefined &&
        nextStage.sequence !== undefined &&
        existingStage.sequence !== undefined &&
        nextStage.sequence < existingStage.sequence;

      if (isStaleFrame) {
        // A reordered or retried SSE frame arrived behind one already
        // applied for this stage (network reorder, a retry, a duplicate
        // publish) — drop it instead of letting it regress status (e.g.
        // COMPLETED -> ACTIVE) or overwrite a newer label/description.
        return;
      }

      const next = [...prev];
      next[existingIndex] = nextStage;
      progressStagesRef.current = next;
      setProgressStages(next);
      setCurrentStageLabel(nextStage.label);
    },
    [],
  );

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
          const parsed = JSON.parse(data) as RouterStreamEvent;

          if (parsed.eventId !== undefined) {
            if (processedEventIdsRef.current.has(parsed.eventId)) {
              // Verbatim redelivery of a frame already applied (e.g. a
              // durable-journal replay/resume) — skip it rather than
              // re-running side effects (fallback list growth, stage
              // upserts) a second time.
              return;
            }
            rememberProcessedEventId(parsed.eventId);
          }

          if (isSimpleProgressStreamEvent(parsed)) {
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
            settleActiveStages();
            setStreamCompletedAt(Date.now());
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
            settleActiveStages();
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
  }, [
    threadId,
    isActive,
    resetStream,
    upsertStage,
    flushLive,
    settleActiveStages,
    rememberProcessedEventId,
    t,
  ]);

  // Clean up when no longer waiting
  useEffect(() => {
    if (!isActive && connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }
  }, [isActive]);

  return {
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
  };
}
