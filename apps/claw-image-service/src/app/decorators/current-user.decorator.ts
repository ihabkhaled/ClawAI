import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type AuthenticatedRequest, type AuthenticatedUser } from '../../common/types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
