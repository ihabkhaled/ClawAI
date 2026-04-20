import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AgentAuthContext, AgentRequest } from '../types/auth.types';

export const AgentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AgentAuthContext => {
    const request = ctx.switchToHttp().getRequest<AgentRequest>();
    if (request.agentSession === undefined) {
      throw new UnauthorizedException('Agent session context missing');
    }
    return request.agentSession;
  },
);
