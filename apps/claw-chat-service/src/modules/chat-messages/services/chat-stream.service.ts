import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { type StreamEvent } from '../types/stream.types';
import { type FallbackAttemptData } from '../types/execution.types';
import { ProgressActorType, StreamEventType } from '../../../common/enums';

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
      stageId: 'router:selection',
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

  emitJudgeEvaluating(threadId: string, criticModel: string, judgeModel: string): void {
    this.emit({
      threadId,
      type: StreamEventType.JUDGE_EVALUATING,
      criticModel,
      judgeModel,
      label: 'Verifying answer',
      description: `Checking the draft with ${judgeModel}.`,
      actorType: ProgressActorType.JUDGE,
      actorName: judgeModel,
      stageId: `judge:${judgeModel}`,
      status: 'active',
    });
    this.logger.debug(
      `Emitted judge_evaluating for thread ${threadId}: critic=${criticModel} judge=${judgeModel}`,
    );
  }

  emitError(threadId: string, error: string): void {
    this.emit({
      threadId,
      type: StreamEventType.ERROR,
      error,
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

  getRecentEvents(threadId: string): StreamEvent[] {
    return [...(this.recentEvents.get(threadId) ?? [])];
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
