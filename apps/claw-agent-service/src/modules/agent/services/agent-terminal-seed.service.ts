import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { BusinessException } from '../../../common/errors/business.exception';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { SeedCommandInput } from '../types/seed-command.types';

@Injectable()
export class AgentTerminalSeedService {
  private readonly logger = new Logger(AgentTerminalSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seedCommand(body: SeedCommandInput): Promise<{ terminalCommandId: string }> {
    this.logger.debug(`seedCommand: userId=${body.userId}`);
    const session = await this.prisma.agentSession.findFirst({
      where: { userId: body.userId, status: 'CONNECTED' },
      orderBy: { lastHeartbeatAt: 'desc' },
    });
    if (session === null) {
      throw new BusinessException(
        'agent.terminal.noActiveDevice',
        'NO_ACTIVE_AGENT_DEVICE',
        HttpStatus.CONFLICT,
        { userId: body.userId },
      );
    }
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const command = await this.prisma.terminalCommand.create({
      data: {
        sessionId: session.id,
        userId: body.userId,
        command: `# Implementation brief from ClawAI workspace handoff\n${body.brief.slice(0, 8000)}`,
        status: 'PENDING_APPROVAL',
        expiresAt,
        timeoutSeconds: 1800,
      },
    });
    return { terminalCommandId: command.id };
  }
}
