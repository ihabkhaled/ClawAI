import { HttpStatus, Injectable } from '@nestjs/common';
import { AgentEventRepository } from '../repositories/agent-event.repository';
import { AgentSessionRepository } from '../repositories/agent-session.repository';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import type { CreateFileEventsDto } from '../dto/create-file-events.dto';
import type {
  ListEventsQuery,
  PaginatedFileEvents,
  ReportEventsResult,
} from '../types/agent.types';

@Injectable()
export class AgentEventService {
  constructor(
    private readonly eventRepository: AgentEventRepository,
    private readonly sessionRepository: AgentSessionRepository,
  ) {}

  async reportEvents(
    sessionId: string,
    userId: string,
    dto: CreateFileEventsDto,
  ): Promise<ReportEventsResult> {
    if (dto.sessionId !== sessionId) {
      throw new BusinessException(
        'agent.event.session_mismatch',
        'FORBIDDEN',
        HttpStatus.FORBIDDEN,
      );
    }
    const session = await this.sessionRepository.findById(sessionId);
    if (session === null) throw new EntityNotFoundException('AgentSession', sessionId);
    if (session.userId !== userId) {
      throw new BusinessException('agent.event.forbidden', 'FORBIDDEN', HttpStatus.FORBIDDEN);
    }
    const count = await this.eventRepository.createMany(
      dto.events.map((e) => ({
        sessionId,
        userId,
        eventType: e.eventType,
        filePath: e.filePath,
        repoId: e.repoId,
      })),
    );
    return { count };
  }

  async listEvents(userId: string, query: ListEventsQuery): Promise<PaginatedFileEvents> {
    return this.eventRepository.findAllByUser(userId, query);
  }
}
