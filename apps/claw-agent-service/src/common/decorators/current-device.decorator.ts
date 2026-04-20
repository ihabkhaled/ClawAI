import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AgentRequest, DeviceContext } from '../types/auth.types';

export const CurrentDevice = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DeviceContext | undefined => {
    const request = ctx.switchToHttp().getRequest<AgentRequest>();
    return request.deviceContext;
  },
);
