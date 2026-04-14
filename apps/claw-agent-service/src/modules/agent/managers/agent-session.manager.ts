import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AgentSessionRepository } from '../repositories/agent-session.repository';
import {
  CLEANUP_INTERVAL_MS,
  SESSION_HEARTBEAT_TIMEOUT_SECONDS,
} from '../../../common/constants/agent.constants';

@Injectable()
export class AgentSessionManager {
  private readonly logger = new Logger(AgentSessionManager.name);

  constructor(private readonly repository: AgentSessionRepository) {}

  @Interval(CLEANUP_INTERVAL_MS)
  async expireStaleSessions(): Promise<void> {
    const cutoff = new Date(Date.now() - SESSION_HEARTBEAT_TIMEOUT_SECONDS * 1000);
    const stale = await this.repository.findStaleSessions(cutoff);
    if (stale.length === 0) return;
    const count = await this.repository.markExpired(stale.map((s) => s.id));
    this.logger.log(`Expired ${count} stale agent session(s)`);
  }
}
