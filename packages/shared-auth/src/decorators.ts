import { SetMetadata, createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { type UserRole, type AuthenticatedRequest, type AuthenticatedUser } from "@claw/shared-types";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = (): ReturnType<typeof SetMetadata> => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRole[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
