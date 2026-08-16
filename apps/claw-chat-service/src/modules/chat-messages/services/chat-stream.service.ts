import { Injectable, Logger } from '@nestjs/common';
import { concat, filter, from, type Observable, Subject } from 'rxjs';
import { ROUTER_TRACE_TERMINAL_STAGE_ID } from '@claw/shared-constants';
import {
  type ContentDeltaEmitInput,
  type LifecycleEmitInput,
  type MetricsEmitInput,
  type ReasoningDeltaEmitInput,
  type ResearchProgressEmitInput,
  type StreamErrorEmitInput,
  type StreamErrorMetadata,
  type StreamEvent,
  type UsageEmitInput,
} from '../types/stream.types';
import { type FallbackAttemptData } from '../types/execution.types';
import { type OrchestrationStagePayload } from '../types/orchestration-stage.types';
import {
  AiStreamStage,
  OrchestrationStageStatus,
  ProgressActorType,
  StreamEventType,
} from '../../../common/enums';

@Injectable()
export class ChatStreamService {
  private readonly logger = new Logger(ChatStreamService.name);
  private readonly recentEvents = new Map<string, StreamEvent[]>();
  private readonly sequenceByThread = new Map<string, number>();
  private static readonly RECENT_EVENT_LIMIT = 100;
  readonly eventBus = new Subject<StreamEvent>();
  private readonly responseProgressBeats = [
    {
      label: 'Understanding your request',
      description: 'Reading the prompt and identifying the task type.',
      stageId: 'model-progress:understanding',
    },
    {
      label: 'Checking available context',
      description: 'Looking at recent messages and attached context that may help the answer.',
      stageId: 'model-progress:context',
    },
    {
      label: 'Preparing the final answer',
      description: '',
      stageId: 'model-progress:answer',
    },
    {
      label: 'Still working',
      description: 'The model is taking a little longer, but the request is still active.',
      stageId: 'model-progress:waiting',
    },
  ] as const;

  emitRequestAccepted(threadId: string): void {
    // Every run type (chat, pipeline, parallel/compare, task-decomposition)
    // calls this first. Clearing the buffer here — instead of only capping it
    // by count — scopes replay to "events since this run started": without
    // it, a client reconnecting for message N+1 replays message N's terminal
    // DONE from the shared per-thread buffer before any live event for the
    // new run arrives, and the UI reads that stale DONE as immediate
    // completion and stops listening.
    this.recentEvents.delete(threadId);
    this.emit({
      threadId,
      type: StreamEventType.REQUEST_ACCEPTED,
      label: 'Request accepted',
      description: 'Claw received your message and is preparing the run.',
      actorType: ProgressActorType.REQUEST,
      actorName: 'Claw',
      stageId: 'request:accepted',
      status: 'active',
    });
    this.logger.debug(`Emitted request_accepted for thread ${threadId}`);
  }

  emitRouterStarted(threadId: string, routerModel?: string | null): void {
    this.emit({
      threadId,
      type: StreamEventType.ROUTER_STARTED,
      label: 'Routing request',
      description: 'Selecting the best execution path for this message.',
      actorType: ProgressActorType.ROUTER,
      actorName: routerModel ?? 'Auto router',
      model: routerModel ?? undefined,
      // Same stage id the cloud-router trace closes with ROUTER_COMPLETED, so
      // the "Routing request" frame this emits resolves into that decision
      // instead of sitting active beside it as a second row.
      stageId: ROUTER_TRACE_TERMINAL_STAGE_ID,
      status: 'active',
    });
    this.logger.debug(`Emitted router_started for thread ${threadId}: ${routerModel ?? 'auto'}`);
  }

  emitResearchStarted(threadId: string, workflow: string): void {
    this.emit({
      threadId,
      type: StreamEventType.RESEARCH_STARTED,
      label: 'Gathering evidence',
      description: `Running ${workflow.toLowerCase().replaceAll('_', ' ')} research steps.`,
      actorType: ProgressActorType.TOOL,
      actorName: 'Research workflow',
      stageId: 'research:evidence',
      status: 'active',
    });
    this.logger.debug(`Emitted research_started for thread ${threadId}: ${workflow}`);
  }

  emitResearchCompleted(threadId: string, itemCount: number, toolsUsed: string[]): void {
    this.emit({
      threadId,
      type: StreamEventType.RESEARCH_COMPLETED,
      label: 'Evidence ready',
      description: `Collected ${String(itemCount)} evidence items using ${toolsUsed.join(', ') || 'research tools'}.`,
      actorType: ProgressActorType.SYSTEM,
      actorName: 'Research workflow',
      stageId: 'research:evidence',
      status: 'completed',
    });
    this.logger.debug(
      `Emitted research_completed for thread ${threadId}: items=${String(itemCount)}`,
    );
  }

  // Fine-grained research-enricher lifecycle frame. One method covers all
  // five RESEARCH_* sub-stages (started / sources_found / fetching /
  // completed / failed). Follows the same RxJS+replay buffer pattern as
  // emitProgressStage — the event lands on the shared eventBus + recent
  // event buffer so the FE rich-progress panel reconstructs the lifecycle
  // on reconnect.
  emitResearchProgress(threadId: string, input: ResearchProgressEmitInput): void {
    const defaults = this.researchStageDefaults(input.stage);
    const actorType =
      input.stage === AiStreamStage.RESEARCH_FAILED
        ? ProgressActorType.SYSTEM
        : ProgressActorType.TOOL;
    this.emit({
      threadId,
      type: StreamEventType.RESEARCH_PROGRESS,
      stage: input.stage,
      label: input.label ?? defaults.label,
      description: input.description ?? defaults.description,
      actorType,
      actorName: 'Research enricher',
      stageId: `research:${input.stage}`,
      status: defaults.status,
      researchDetails: input.details,
    });
    this.logger.debug(`Emitted research_progress for thread ${threadId}: stage=${input.stage}`);
  }

  private researchStageDefaults(stage: AiStreamStage): {
    label: string;
    description: string;
    status: StreamEvent['status'];
  } {
    switch (stage) {
      case AiStreamStage.RESEARCH_STARTED:
        return {
          label: 'Starting research',
          description: 'Running a web search to gather evidence for this run.',
          status: 'active',
        };
      case AiStreamStage.RESEARCH_SOURCES_FOUND:
        return {
          label: 'Search results found',
          description: 'Selecting sources to fetch for deeper context.',
          status: 'active',
        };
      case AiStreamStage.RESEARCH_FETCHING:
        return {
          label: 'Fetching source',
          description: 'Reading a candidate source to extract supporting text.',
          status: 'active',
        };
      case AiStreamStage.RESEARCH_COMPLETED:
        return {
          label: 'Research complete',
          description: 'Evidence is ready and will be included in the prompt.',
          status: 'completed',
        };
      case AiStreamStage.RESEARCH_FAILED:
        return {
          label: 'Research failed',
          description: 'The research step could not complete; continuing without evidence.',
          status: 'error',
        };
      default:
        return {
          label: 'Research update',
          description: 'Research enricher progress.',
          status: 'active',
        };
    }
  }

  emitProgressStage(
    threadId: string,
    type: StreamEventType,
    options: {
      label: string;
      description?: string;
      actorType?: ProgressActorType;
      actorName?: string;
      provider?: string;
      model?: string;
      stageId?: string;
      status?: StreamEvent['status'];
    },
  ): void {
    this.emit({
      threadId,
      type,
      label: options.label,
      description: options.description,
      actorType: options.actorType,
      actorName: options.actorName,
      provider: options.provider,
      model: options.model,
      stageId: options.stageId,
      status: options.status ?? 'active',
    });
    this.logger.debug(`Emitted ${type} for thread ${threadId}: ${options.label}`);
  }

  // Emit one orchestration sub-stage frame for the 9 advanced-orchestration
  // managers (consensus / escalation-chain / repair / decompose / best-of-n /
  // verifier / pipeline / cost-ensemble / role-pack). The payload reuses the
  // shared RESPONSE_STREAMING StreamEventType so the FE rich-progress panel
  // picks it up via the same `progressStages` channel the chat-thread page
  // already renders. `threadId` may be the empty string in rare paths — when
  // empty we no-op rather than crash the orchestration.
  emitOrchestrationStage(threadId: string, payload: OrchestrationStagePayload): void {
    if (threadId.length === 0) {
      return;
    }
    this.emit({
      threadId,
      type: StreamEventType.RESPONSE_STREAMING,
      label: payload.label,
      description: payload.detail,
      actorType: ProgressActorType.SYSTEM,
      actorName: 'Orchestration',
      stageId: payload.stageId ?? `orchestration:${payload.label}`,
      status: this.mapOrchestrationStatus(payload.status),
    });
    this.logger.debug(
      `Emitted orchestration_stage for thread ${threadId}: ${payload.label} (${payload.status})`,
    );
  }

  private mapOrchestrationStatus(status: OrchestrationStageStatus): StreamEvent['status'] {
    if (status === OrchestrationStageStatus.COMPLETED) {
      return 'completed';
    }
    if (status === OrchestrationStageStatus.ERROR) {
      return 'error';
    }
    return 'active';
  }

  emitCompletion(threadId: string, provider: string, model: string): void {
    this.emit({
      threadId,
      type: StreamEventType.DONE,
      provider,
      model,
      label: 'Response complete',
      description: 'The final answer is ready.',
      actorType: ProgressActorType.MODEL,
      actorName: `${provider} / ${model}`,
      stageId: 'response:complete',
      status: 'completed',
    });
    this.logger.debug(`Emitted completion for thread ${threadId}`);
  }

  emitFallbackAttempt(threadId: string, data: FallbackAttemptData): void {
    this.emit({
      threadId,
      type: StreamEventType.FALLBACK_ATTEMPT,
      failedProvider: data.failedProvider,
      failedModel: data.failedModel,
      error: data.error,
      attempt: data.attempt,
      totalCandidates: data.totalCandidates,
      nextProvider: data.nextProvider,
      nextModel: data.nextModel,
      label: 'Fallback in progress',
      description: `Switching from ${data.failedProvider}/${data.failedModel} to ${data.nextProvider ?? 'another provider'}/${data.nextModel ?? 'another model'}.`,
      actorType: ProgressActorType.SYSTEM,
      actorName: 'Fallback handler',
      stageId: `fallback:${String(data.attempt)}`,
      status: 'active',
    });
    this.logger.debug(
      `Emitted fallback attempt for thread ${threadId}: ${data.failedProvider}/${data.failedModel} → ${data.nextProvider ?? 'none'}/${data.nextModel ?? 'none'}`,
    );
  }

  emitProviderSelected(threadId: string, provider: string, model: string): void {
    this.emit({
      threadId,
      type: StreamEventType.PROVIDER_SELECTED,
      provider,
      model,
      label: 'Model selected',
      description: `${provider}/${model} is preparing the response.`,
      actorType: ProgressActorType.MODEL,
      actorName: `${provider} / ${model}`,
      stageId: `model:${provider}:${model}:selected`,
      status: 'active',
    });
    this.logger.debug(`Emitted provider_selected for thread ${threadId}: ${provider}/${model}`);
  }

  // `criticModel` is null when the critic is disabled for this run. The field is
  // then omitted from the envelope entirely so the UI has nothing to render,
  // rather than naming a model that was never called.
  emitJudgeEvaluating(threadId: string, criticModel: string | null, judgeModel: string): void {
    this.emit({
      threadId,
      type: StreamEventType.JUDGE_EVALUATING,
      ...(criticModel === null ? {} : { criticModel }),
      judgeModel,
      label: 'Verifying answer',
      description:
        criticModel === null
          ? `Checking the draft with ${judgeModel}.`
          : `Critiquing with ${criticModel}, then checking with ${judgeModel}.`,
      actorType: ProgressActorType.JUDGE,
      actorName: judgeModel,
      stageId: `judge:${judgeModel}`,
      status: 'active',
    });
    this.logger.debug(
      `Emitted judge_evaluating for thread ${threadId}: critic=${criticModel ?? 'disabled'} judge=${judgeModel}`,
    );
  }

  emitError(threadId: string, error: string, metadata: StreamErrorMetadata = {}): void {
    this.emit({
      threadId,
      type: StreamEventType.ERROR,
      error,
      ...(metadata.code === undefined ? {} : { code: metadata.code }),
      ...(metadata.messageKey === undefined ? {} : { messageKey: metadata.messageKey }),
      label: 'Response failed',
      description: error,
      actorType: ProgressActorType.SYSTEM,
      actorName: 'Execution pipeline',
      stageId: 'response:error',
      status: 'error',
    });
    this.logger.debug(`Emitted error for thread ${threadId}: ${error}`);
  }

  emitResponseStreaming(threadId: string, provider: string, model: string): void {
    this.emit({
      threadId,
      type: StreamEventType.RESPONSE_STREAMING,
      provider,
      model,
      label: 'Composing answer',
      description: `${provider}/${model} is generating the final reply.`,
      actorType: ProgressActorType.MODEL,
      actorName: `${provider} / ${model}`,
      stageId: `model:${provider}:${model}:streaming`,
      status: 'active',
    });
    this.logger.debug(`Emitted response_streaming for thread ${threadId}: ${provider}/${model}`);
  }

  startResponseProgressHeartbeat(threadId: string, provider: string, model: string): () => void {
    let beatIndex = 0;
    const emitBeat = (): void => {
      const beat =
        this.responseProgressBeats[Math.min(beatIndex, this.responseProgressBeats.length - 1)];
      if (!beat) {
        return;
      }

      this.emitProgressStage(threadId, StreamEventType.MODEL_PROGRESS, {
        label: beat.label,
        description: beat.description || `${provider}/${model} is composing a safe response.`,
        actorType: ProgressActorType.MODEL,
        actorName: `${provider} / ${model}`,
        provider,
        model,
        stageId:
          beatIndex < this.responseProgressBeats.length - 1
            ? beat.stageId
            : `${beat.stageId}:${String(beatIndex)}`,
        status: 'active',
      });
      beatIndex++;
    };

    emitBeat();
    const interval = setInterval(emitBeat, 1_500);

    return () => {
      clearInterval(interval);
    };
  }

  // --- Rich streaming emitters (live token / reasoning / metric deltas) ---
  // NOTE: delta / reasoningDelta / metrics / usage fields are NOT passed
  // through the 240-char label sanitizer (sanitizeEvent only touches
  // label/description/error), so the model's real answer text streams intact.

  emitStreamLifecycle(threadId: string, input: LifecycleEmitInput): void {
    this.emit({
      threadId,
      type: StreamEventType.LIFECYCLE,
      provider: input.provider,
      model: input.model,
      streamRunId: input.streamRunId,
      messageId: input.messageId,
      laneId: input.laneId,
      parallelGroupId: input.parallelGroupId,
      protocol: input.protocol,
      stage: input.stage,
      progressPercent: input.progressPercent,
      progressConfidence: input.progressConfidence,
      reasoningVisibility: input.reasoningVisibility,
      label: input.label,
      description: input.description,
      actorType: ProgressActorType.MODEL,
      actorName: `${input.provider} / ${input.model}`,
      stageId: `stream:${input.laneId ?? input.streamRunId ?? threadId}:${input.stage}`,
      status: input.status ?? 'active',
    });
  }

  emitContentDelta(threadId: string, input: ContentDeltaEmitInput): void {
    this.emit({
      threadId,
      type: StreamEventType.CONTENT_DELTA,
      provider: input.provider,
      model: input.model,
      streamRunId: input.streamRunId,
      messageId: input.messageId,
      laneId: input.laneId,
      parallelGroupId: input.parallelGroupId,
      delta: input.delta,
      accumulatedChars: input.accumulatedChars,
    });
  }

  emitReasoningDelta(threadId: string, input: ReasoningDeltaEmitInput): void {
    this.emit({
      threadId,
      type: StreamEventType.REASONING_DELTA,
      provider: input.provider,
      model: input.model,
      streamRunId: input.streamRunId,
      messageId: input.messageId,
      laneId: input.laneId,
      parallelGroupId: input.parallelGroupId,
      reasoningDelta: input.reasoningDelta,
      reasoningVisibility: input.visibility,
    });
  }

  emitMetrics(threadId: string, input: MetricsEmitInput): void {
    this.emit({
      threadId,
      type: StreamEventType.METRICS,
      provider: input.provider,
      model: input.model,
      streamRunId: input.streamRunId,
      messageId: input.messageId,
      laneId: input.laneId,
      parallelGroupId: input.parallelGroupId,
      metrics: input.metrics,
      progressPercent: input.metrics.progressPercent,
      progressConfidence: input.metrics.progressConfidence,
    });
  }

  emitUsage(threadId: string, input: UsageEmitInput): void {
    this.emit({
      threadId,
      type: StreamEventType.USAGE,
      provider: input.provider,
      model: input.model,
      streamRunId: input.streamRunId,
      messageId: input.messageId,
      laneId: input.laneId,
      parallelGroupId: input.parallelGroupId,
      usage: input.usage,
    });
  }

  emitStreamError(threadId: string, input: StreamErrorEmitInput): void {
    this.emit({
      threadId,
      type: StreamEventType.ERROR,
      provider: input.provider,
      model: input.model,
      streamRunId: input.streamRunId,
      messageId: input.messageId,
      laneId: input.laneId,
      parallelGroupId: input.parallelGroupId,
      stage: input.stage,
      code: input.code,
      ...(input.messageKey === undefined ? {} : { messageKey: input.messageKey }),
      retryable: input.retryable,
      partialContentPreserved: input.partialContentPreserved,
      label: 'Response failed',
      description: input.safeMessage,
      actorType: ProgressActorType.SYSTEM,
      actorName: `${input.provider} / ${input.model}`,
      stageId: `stream:${input.laneId ?? input.streamRunId ?? threadId}:error`,
      status: 'error',
    });
  }

  getRecentEvents(threadId: string): StreamEvent[] {
    return [...(this.recentEvents.get(threadId) ?? [])];
  }

  streamEvents(threadId: string, replayRecent = true): Observable<StreamEvent> {
    const liveEvents = this.eventBus.pipe(filter((event) => event.threadId === threadId));
    if (!replayRecent) {
      return liveEvents;
    }
    return concat(from(this.getRecentEvents(threadId)), liveEvents);
  }

  private emit(event: StreamEvent): void {
    const safeEvent = this.decorateEvent(this.sanitizeEvent(event));
    this.storeRecentEvent(safeEvent);
    this.eventBus.next(safeEvent);
  }

  private decorateEvent(event: StreamEvent): StreamEvent {
    const nextSequence = (this.sequenceByThread.get(event.threadId) ?? 0) + 1;
    this.sequenceByThread.set(event.threadId, nextSequence);

    return {
      ...event,
      eventId: `${event.threadId}:${String(nextSequence)}`,
      sequence: nextSequence,
      createdAt: new Date().toISOString(),
    };
  }

  private storeRecentEvent(event: StreamEvent): void {
    const current = this.recentEvents.get(event.threadId) ?? [];
    const next = [...current, event].slice(-ChatStreamService.RECENT_EVENT_LIMIT);
    this.recentEvents.set(event.threadId, next);
  }

  private sanitizeEvent(event: StreamEvent): StreamEvent {
    return {
      ...event,
      label: this.sanitizeText(event.label, 'Preparing safe progress update'),
      description: this.sanitizeText(event.description, 'Internal details are hidden for safety.'),
      error: this.sanitizeText(event.error, 'The run failed.'),
    };
  }

  private sanitizeText(value: string | undefined, unsafeFallback: string): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    const normalized = [...value]
      .map((char) => {
        const code = char.charCodeAt(0);
        return code < 32 || code === 127 ? ' ' : char;
      })
      .join('')
      .replaceAll(/\s+/g, ' ')
      .trim();
    const unsafePattern =
      /(chain[-\s]?of[-\s]?thought|private reasoning|hidden reasoning|system prompt|developer message|internal prompt)/i;

    if (unsafePattern.test(normalized)) {
      return unsafeFallback;
    }

    return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
  }
}
