import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { Prisma } from '../../../generated/prisma';
import { AgentSessionRepository } from '../repositories/agent-session.repository';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { AgentSessionStatus } from '../../../common/enums/agent-session-status.enum';
import { SESSION_HEARTBEAT_TIMEOUT_SECONDS } from '../../../common/constants/agent.constants';
import type { CreateAgentSessionDto } from '../dto/create-agent-session.dto';
import type { ListSessionsQueryDto } from '../dto/list-sessions-query.dto';
import type {
  AgentSessionWithCounts,
  HeartbeatResult,
  PaginatedAgentSessions,
  RegisterSessionResult,
} from '../types/agent.types';

@Injectable()
export class AgentSessionService {
  private readonly logger = new Logger(AgentSessionService.name);

  constructor(
    private readonly repository: AgentSessionRepository,
    private readonly rabbitMQ: RabbitMQService,
  ) {}

  async register(userId: string, dto: CreateAgentSessionDto): Promise<RegisterSessionResult> {
    const sessionKey = randomBytes(32).toString('hex');
    const session = await this.repository.create({
      userId,
      sessionKey,
      hostname: dto.hostname,
      platform: dto.platform,
      agentVersion: dto.agentVersion,
      status: AgentSessionStatus.CONNECTED,
      lastHeartbeatAt: new Date(),
      metadata:
        dto.metadata !== undefined ? (dto.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
    });
    void this.publishEvent(EventPattern.AGENT_SESSION_CONNECTED, { sessionId: session.id, userId });
    this.logger.log(`Agent session registered: ${session.id} (${dto.hostname})`);
    return { ...session, sessionKey };
  }

  async getSessions(userId: string, query: ListSessionsQueryDto): Promise<PaginatedAgentSessions> {
    return this.repository.findAllByUser(userId, query);
  }

  async getSession(id: string, userId: string): Promise<AgentSessionWithCounts> {
    return this.getSessionRaw(id, userId);
  }

  async heartbeat(sessionId: string): Promise<HeartbeatResult> {
    await this.repository.updateHeartbeat(sessionId);
    return { ok: true, nextHeartbeatInSeconds: SESSION_HEARTBEAT_TIMEOUT_SECONDS / 2 };
  }

  async disconnect(id: string, userId: string): Promise<AgentSessionWithCounts> {
    await this.getSessionRaw(id, userId);
    await this.repository.update(id, {
      status: AgentSessionStatus.DISCONNECTED,
      disconnectedAt: new Date(),
    });
    void this.publishEvent(EventPattern.AGENT_SESSION_DISCONNECTED, { sessionId: id, userId });
    return this.getSessionRaw(id, userId);
  }

  private async getSessionRaw(id: string, userId: string): Promise<AgentSessionWithCounts> {
    const session = await this.repository.findById(id);
    if (session === null) throw new EntityNotFoundException('AgentSession', id);
    if (session.userId !== userId) {
      throw new BusinessException('agent.session.forbidden', 'FORBIDDEN', HttpStatus.FORBIDDEN);
    }
    return session;
  }

  private async publishEvent(
    pattern: EventPattern,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.rabbitMQ.publish(pattern, { ...payload, timestamp: new Date().toISOString() });
    } catch (error) {
      this.logger.error(
        `Failed to publish ${pattern}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
