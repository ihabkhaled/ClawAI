import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { type StreamEvent } from '../types/stream.types';
import { type FallbackAttemptData } from '../types/execution.types';
import { StreamEventType } from '../../../common/enums';

@Injectable()
export class ChatStreamService {
  private readonly logger = new Logger(ChatStreamService.name);
  readonly eventBus = new Subject<StreamEvent>();

  emitCompletion(threadId: string, provider: string, model: string): void {
    this.eventBus.next({ threadId, type: StreamEventType.DONE, provider, model });
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
    });
    this.logger.debug(
      `Emitted fallback attempt for thread ${threadId}: ${data.failedProvider}/${data.failedModel} → ${data.nextProvider ?? 'none'}/${data.nextModel ?? 'none'}`,
    );
  }

  emitError(threadId: string, error: string): void {
    this.eventBus.next({ threadId, type: StreamEventType.ERROR, error });
    this.logger.debug(`Emitted error for thread ${threadId}: ${error}`);
  }
}
