import { useCallback, useEffect, useRef, useState } from 'react';

import { API_BASE_URL, PROCESSED_STREAM_EVENT_ID_CACHE_LIMIT } from '@/constants';
import {
  FallbackFailureType,
  SseConnectionHealth,
  StreamEventType,
  VisibleProgressStageStatus,
} from '@/enums';
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

/**
 * The chat SSE subscription.
 *
 * `replayPastEvents` decides whether the server replays its buffer on connect,
 * and getting it wrong is what produced the reported "200 then
 * net::ERR_ABORTED, over and over".
 *
 * The buffer holds the previous run's terminal `DONE` until the backend clears
 * it, which it does when the new run is accepted. But the client opens this
 * stream *before* the POST has left the browser, so on a fresh send the two
 * race and the client usually wins: it receives the old `DONE`, concludes the
 * run is over, drops the waiting flag, and thereby aborts the connection it
 * just opened — after which the recovery effect re-arms and the whole thing
 * repeats.
 *
 * A freshly-sent run has missed nothing, so it asks for no replay at all and
 * the race disappears. Replay is for what it was always for: catching up after
 * a reload while a run was already in flight.
 */
export function useChatStream(threadId: string, isActive: boolean, replayPastEvents = true) {
  const { t } = useTranslation();
  // Mirrors `t` so the connect effect below can read the current translator
  // without depending on its identity. `t`'s stability depends on an
  // RSC-supplied dictionary object; any layout re-render that hands down a
  // fresh one closed and reopened the stream for no reason connected to the
  // stream itself.
  const tRef = useRef(t);
  tRef.current = t;
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
  /**
   * What the client believes about the connection, shown to the user.
   *
   * A dead stream used to be completely silent: the answer simply never
   * arrived, and nothing on the page distinguished "still thinking" from "the
   * connection died four minutes ago".
   */
  const [connectionHealth, setConnectionHealth] = useState<SseConnectionHealth>(
    SseConnectionHealth.LIVE,
  );
  const [streamLive, setStreamLive] = useState<StreamLiveState>({
    content: '',
    reasoning: '',
    isStreaming: false,
  });
  const connectionRef = useRef<SseConnection | null>(null);
  /**
   * Whether this connection has delivered a terminal event.
   *
   * Without it, any clean close reads as "the run finished" — including the
   * one an ownership check produces on a transient database blip, which then
   * permanently downgraded the thread to REST polling.
   */
  const sawTerminalEventRef = useRef(false);
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

    // `replay=false` is a supported query on the stream endpoint; omitting it
    // means replay=true.
    const url = replayPastEvents
      ? `${API_BASE_URL}/chat-messages/stream/${threadId}`
      : `${API_BASE_URL}/chat-messages/stream/${threadId}?replay=false`;

    logger.debug({
      component: 'chat',
      action: 'sse-connect',
      message: 'Connecting to SSE stream',
      details: { threadId, replay: replayPastEvents },
    });

    // Reset per-connection: a terminal event belongs to the run that produced
    // it, and this ref is what tells a clean close whether the run is over.
    sawTerminalEventRef.current = false;

    const connection = connectSse(url, {
      shouldReconnectAfterClose: () => !sawTerminalEventRef.current,
      onHealthChange: setConnectionHealth,
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
            sawTerminalEventRef.current = true;
            setJudgeEvaluating(false);
            setExecutingModel(null);
            setJudgeModel(null);
            flushLive(parsed, false);
            upsertStage(parsed, VisibleProgressStageStatus.COMPLETED);
            settleActiveStages();
            setStreamCompletedAt(Date.now());
          }

          if (parsed.type === StreamEventType.ERROR) {
            sawTerminalEventRef.current = true;
            const localizedError = resolveChatStreamError(parsed, tRef.current);
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
    replayPastEvents,
    resetStream,
    upsertStage,
    flushLive,
    settleActiveStages,
    rememberProcessedEventId,
  ]);

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
    connectionHealth,
    resetStream,
  };
}
