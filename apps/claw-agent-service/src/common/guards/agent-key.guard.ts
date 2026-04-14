import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { AgentSessionStatus } from '../enums/agent-session-status.enum';
import type { AgentAuthContext, AgentRequest } from '../types/auth.types';

@Injectable()
export class AgentKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AgentRequest>();
    const authHeader = request.headers.authorization as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing agent session key');
    }
    const sessionKey = authHeader.slice(7);
    const session = await this.prisma.agentSession.findUnique({
      where: { sessionKey },
      select: { id: true, userId: true, status: true },
    });
    if (session?.status !== AgentSessionStatus.CONNECTED) {
      throw new UnauthorizedException('Invalid or expired agent session');
    }
    const ctx: AgentAuthContext = { sessionId: session.id, userId: session.userId };
    request.agentSession = ctx;
    return true;
  }
}
