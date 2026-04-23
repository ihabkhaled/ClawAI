import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { type StreamEvent } from '../types/stream.types';
import { type FallbackAttemptData } from '../types/execution.types';
import { ProgressActorType, StreamEventType } from '../../../common/enums';

@Injectable()
export class ChatStreamService {
  private readonly logger = new Logger(ChatStreamService.name);
  readonly eventBus = new Subject<StreamEvent>();

  emitRequestAccepted(threadId: string): void {
    this.eventBus.next({
      threadId,
      type: StreamEventType.REQUEST_ACCEPTED,
      label: 'Request accepted',
      description: 'Claw received your message and is preparing the run.',
      actorType: ProgressActorType.REQUEST,
      actorName: 'Claw',
    });
    this.logger.debug(`Emitted request_accepted for thread ${threadId}`);
  }

  emitRouterStarted(threadId: string, routerModel?: string | null): void {
    this.eventBus.next({
      threadId,
      type: StreamEventType.ROUTER_STARTED,
      label: 'Routing request',
      description: 'Selecting the best execution path for this message.',
      actorType: ProgressActorType.ROUTER,
      actorName: routerModel ?? 'Auto router',
      model: routerModel ?? undefined,
    });
    this.logger.debug(`Emitted router_started for thread ${threadId}: ${routerModel ?? 'auto'}`);
  }

  emitResearchStarted(threadId: string, workflow: string): void {
    this.eventBus.next({
      threadId,
      type: StreamEventType.ROUTER_STARTED,
      label: 'Gathering evidence',
      description: `Running ${workflow.toLowerCase().replaceAll('_', ' ')} research steps.`,
      actorType: ProgressActorType.SYSTEM,
      actorName: 'Research workflow',
    });
    this.logger.debug(`Emitted research_started for thread ${threadId}: ${workflow}`);
  }

  emitResearchCompleted(threadId: string, itemCount: number, toolsUsed: string[]): void {
    this.eventBus.next({
      threadId,
      type: StreamEventType.RESPONSE_STREAMING,
      label: 'Evidence ready',
      description: `Collected ${String(itemCount)} evidence items using ${toolsUsed.join(', ') || 'research tools'}.`,
      actorType: ProgressActorType.SYSTEM,
      actorName: 'Research workflow',
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
    },
  ): void {
    this.eventBus.next({
      threadId,
      type,
      label: options.label,
      description: options.description,
      actorType: options.actorType,
      actorName: options.actorName,
      provider: options.provider,
      model: options.model,
    });
    this.logger.debug(`Emitted ${type} for thread ${threadId}: ${options.label}`);
  }

  emitCompletion(threadId: string, provider: string, model: string): void {
    this.eventBus.next({
      threadId,
      type: StreamEventType.DONE,
      provider,
      model,
      label: 'Response complete',
      description: 'The final answer is ready.',
      actorType: ProgressActorType.MODEL,
      actorName: `${provider} / ${model}`,
    });
    this.logger.debug(`Emitted completion for thread ${threadId}`);
  }

  emitFallbackAttempt(threadId: string, data: FallbackAttemptData): void {
    this.eventBus.next({
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
    });
    this.logger.debug(
      `Emitted fallback attempt for thread ${threadId}: ${data.failedProvider}/${data.failedModel} → ${data.nextProvider ?? 'none'}/${data.nextModel ?? 'none'}`,
    );
  }

  emitProviderSelected(threadId: string, provider: string, model: string): void {
    this.eventBus.next({
      threadId,
      type: StreamEventType.PROVIDER_SELECTED,
      provider,
      model,
      label: 'Model selected',
      description: `${provider}/${model} is preparing the response.`,
      actorType: ProgressActorType.MODEL,
      actorName: `${provider} / ${model}`,
    });
    this.logger.debug(`Emitted provider_selected for thread ${threadId}: ${provider}/${model}`);
  }

  emitJudgeEvaluating(threadId: string, criticModel: string, judgeModel: string): void {
    this.eventBus.next({
      threadId,
      type: StreamEventType.JUDGE_EVALUATING,
      criticModel,
      judgeModel,
      label: 'Verifying answer',
      description: `Checking the draft with ${judgeModel}.`,
      actorType: ProgressActorType.JUDGE,
      actorName: judgeModel,
    });
    this.logger.debug(
      `Emitted judge_evaluating for thread ${threadId}: critic=${criticModel} judge=${judgeModel}`,
    );
  }

  emitError(threadId: string, error: string): void {
    this.eventBus.next({
      threadId,
      type: StreamEventType.ERROR,
      error,
      label: 'Response failed',
      description: error,
      actorType: ProgressActorType.SYSTEM,
      actorName: 'Execution pipeline',
    });
    this.logger.debug(`Emitted error for thread ${threadId}: ${error}`);
  }

  emitResponseStreaming(threadId: string, provider: string, model: string): void {
    this.eventBus.next({
      threadId,
      type: StreamEventType.RESPONSE_STREAMING,
      provider,
      model,
      label: 'Composing answer',
      description: `${provider}/${model} is generating the final reply.`,
      actorType: ProgressActorType.MODEL,
      actorName: `${provider} / ${model}`,
    });
    this.logger.debug(`Emitted response_streaming for thread ${threadId}: ${provider}/${model}`);
  }
}
