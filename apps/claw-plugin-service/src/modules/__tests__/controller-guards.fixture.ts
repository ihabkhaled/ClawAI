import { createHmac } from 'node:crypto';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@claw/shared-auth';
import { PermissionGuard } from '@claw/shared-entitlements';
import type { Permission, UserRole } from '@claw/shared-types';
import type { Mock } from 'vitest';

export const GUARD_SECRET = 'plugin-service-test-secret-0123456789';

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

/** A signed user JWT the real AuthGuard accepts. */
export function signToken(role: UserRole, secret = GUARD_SECRET, userId = 'user-1'): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(
    JSON.stringify({
      sub: userId,
      email: 'user@claw.local',
      role,
      tokenKind: 'user',
      sessionId: 'session-1',
      iss: 'claw-auth-service',
      aud: 'claw-user-api',
      exp: Math.floor(Date.now() / 1000) + 600,
    }),
  );
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest();
  return `${header}.${body}.${base64Url(signature)}`;
}

export type GuardHarness = {
  adapter: { getEntitlements: Mock };
  auth: AuthGuard;
  permission: PermissionGuard;
};

export function buildGuards(permissions: Permission[], failResolution = false): GuardHarness {
  const reflector = new Reflector();
  const adapter = {
    getEntitlements: failResolution
      ? vi.fn().mockRejectedValue(new Error('auth-service down'))
      : vi.fn().mockResolvedValue({ isAdmin: false, permissions }),
  };
  return {
    adapter,
    auth: new AuthGuard(reflector),
    permission: new PermissionGuard(reflector, adapter as never),
  };
}

/** Runs the real AuthGuard then PermissionGuard against a handler of the given controller class. */
export async function runGuards(
  guards: GuardHarness,
  controller: new (...args: never[]) => unknown,
  handler: (...args: never[]) => unknown,
  authorization?: string,
): Promise<boolean> {
  const request: Record<string, unknown> = {
    headers: authorization === undefined ? {} : { authorization },
    method: 'GET',
    url: '/api/v1/plugins',
  };
  const context = {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
  guards.auth.canActivate(context);
  return guards.permission.canActivate(context);
}
