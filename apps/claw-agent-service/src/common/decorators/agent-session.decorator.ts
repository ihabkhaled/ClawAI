import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AgentAuthContext, AgentRequest } from '../types/auth.types';

export const AgentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AgentAuthContext => {
    const request = ctx.switchToHttp().getRequest<AgentRequest>();
    return request.agentSession;
  },
);
