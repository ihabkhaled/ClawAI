import { Injectable, Logger } from '@nestjs/common';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { EntityNotFoundException } from '../../../common/errors';
import { StreamCancellationService } from './stream-cancellation.service';
import { type CancelStreamResult } from '../types/stream.types';

// Authorization + control surface for the SSE stream. Verifies thread
// ownership before a user may subscribe to or cancel a stream, so one user
// can never read or abort another user's run.
@Injectable()
export class StreamControlService {
  private readonly logger = new Logger(StreamControlService.name);

  constructor(
    private readonly threadsRepository: ChatThreadsRepository,
    private readonly cancellation: StreamCancellationService,
  ) {}

  async assertOwnership(threadId: string, userId: string): Promise<void> {
    const thread = await this.threadsRepository.findById(threadId);
    if (thread === null || thread.userId !== userId) {
      this.logger.warn(`assertOwnership: denied threadId=${threadId} userId=${userId}`);
      throw new EntityNotFoundException('ChatThread', threadId);
    }
  }

  async cancelStream(threadId: string, userId: string): Promise<CancelStreamResult> {
    await this.assertOwnership(threadId, userId);
    const cancelled = this.cancellation.cancel(threadId);
    this.logger.log(`cancelStream: threadId=${threadId} cancelled=${String(cancelled)}`);
    return { cancelled };
  }
}
