import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { RetrievalBundle } from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { PreviewContextDto } from '../dto/preview-context.dto';
import { buildInterServiceAuthHeader } from '../../../common/utilities';

@Injectable()
export class ContextPreviewService {
  private readonly logger = new Logger(ContextPreviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async preview(
    threadId: string,
    userId: string,
    dto: PreviewContextDto,
  ): Promise<RetrievalBundle> {
    const thread = await this.prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      throw new EntityNotFoundException('ChatThread', threadId);
    }
    if (thread.userId !== userId) {
      throw new BusinessException(
        'You do not have access to this thread',
        'FORBIDDEN_THREAD_ACCESS',
        HttpStatus.FORBIDDEN,
      );
    }
    const includeMemory = !(dto.disableMemory === true) && thread.useMemory;
    const includeContext = !(dto.disableContext === true) && thread.useContext;
    const tokenBudget = thread.maxTokens ?? 4096;
    const config = AppConfig.get();
    const response = await httpRequest<RetrievalBundle>({
      url: `${config.MEMORY_SERVICE_URL}/api/v1/internal/memories/retrieve`,
      method: 'POST',
      headers: { Authorization: buildInterServiceAuthHeader() },
      body: {
        userId,
        threadId,
        intent: dto.draft,
        attachedPackIds: thread.contextPackIds,
        attachedMemoryIds: [],
        tokenBudget,
        includeMemory,
        includeContext,
      },
      timeoutMs: 5_000,
    });
    if (!response.ok) {
      this.logger.warn(
        `preview: memory-service retrieve failed status=${String(response.status)} — returning empty bundle`,
      );
      return this.emptyBundle(tokenBudget, 'memory_service_unreachable');
    }
    return response.data;
  }

  private emptyBundle(tokenBudget: number, warning: string): RetrievalBundle {
    return {
      memories: [],
      packItems: [],
      assemblyOrder: [],
      tokenBudget,
      tokenBudgetUsed: 0,
      retrievalLatencyMs: 0,
      warnings: [warning],
    };
  }
}
