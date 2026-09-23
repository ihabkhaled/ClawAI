import type { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Permission } from '@claw/shared-types';
import type { AddressInfo } from 'node:net';
import { vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { GlobalExceptionFilter } from '../../../../app/filters/global-exception.filter';
import { AuthGuard } from '../../../../app/guards/auth.guard';
import { RolesGuard } from '../../../../app/guards/roles.guard';
import { UserRole } from '../../../../common/enums';
import { signAccessToken } from '../../../../common/utilities';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { RolesService } from '../../../roles/services/roles.service';
import { GrafanaAccessService } from '../../services/grafana-access.service';
import { GrafanaAccessController } from '../grafana-access.controller';

/**
 * The whole B2 access rule, over real HTTP with the real guard stack: who may
 * mint the Grafana cookie, and whether nginx's verify call honours it.
 * Only Redis and the role→permission lookup are stubbed.
 */
const SECRET = 'grafana-http-spec-jwt-secret-at-least-32-chars';
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.USER]: [Permission.CHAT_USE, Permission.FILES_USE],
};

const revoked = new Set<string>();
let app: INestApplication;
let base = '';

function bearer(role: UserRole, sessionId = `session-${role}`): string {
  const token = signAccessToken(
    {
      sub: `user-${role}`,
      email: `${role.toLowerCase()}@claw.local`,
      role,
      tokenKind: 'user',
      sessionId,
    },
    SECRET,
    '15m',
  );
  return `Bearer ${token}`;
}

async function mint(authorization?: string): Promise<Response> {
  return fetch(`${base}/api/v1/auth/grafana-access`, {
    method: 'POST',
    headers: authorization === undefined ? {} : { authorization },
  });
}

async function verify(cookie?: string): Promise<Response> {
  return fetch(`${base}/api/v1/auth/grafana-access/verify`, {
    headers: cookie === undefined ? {} : { cookie },
  });
}

function cookieFrom(response: Response): string {
  const header = response.headers.get('set-cookie') ?? '';
  return header.split(';')[0] ?? '';
}

beforeAll(async () => {
  vi.spyOn(AppConfig, 'get').mockReturnValue({
    JWT_SECRET: SECRET,
    JWT_ACCESS_EXPIRY: '15m',
  } as ReturnType<typeof AppConfig.get>);

  const moduleRef = await Test.createTestingModule({
    controllers: [GrafanaAccessController],
    providers: [
      GrafanaAccessService,
      Reflector,
      {
        provide: RedisService,
        useValue: {
          get: async (key: string): Promise<string | null> => (revoked.has(key) ? '1' : null),
        },
      },
      {
        provide: RolesService,
        useValue: {
          resolvePermissionsBySlug: async (slug: string): Promise<Permission[]> =>
            ROLE_PERMISSIONS[slug] ?? [],
        },
      },
      { provide: APP_FILTER, useClass: GlobalExceptionFilter },
      { provide: APP_GUARD, useClass: AuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
    ],
  }).compile();

  app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address() as AddressInfo;
  base = `http://127.0.0.1:${String(address.port)}`;
});

afterAll(async () => {
  await app.close();
  vi.restoreAllMocks();
});

describe('POST /api/v1/auth/grafana-access — who may open Grafana', () => {
  it('an admin gets an httpOnly, Secure, Lax cookie scoped to /grafana', async () => {
    const response = await mint(bearer(UserRole.ADMIN));
    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/^claw_grafana=[\w-]+\.[\w-]+\.[\w-]+;/u);
    expect(setCookie).toContain('Path=/grafana');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Max-Age=900');
    const body = (await response.json()) as { expiresAt?: string; token?: string };
    expect(typeof body.expiresAt).toBe('string');
    // The token only ever travels as the httpOnly cookie, never in a body page script can read.
    expect(body.token).toBeUndefined();
  });

  // A USER is what every plan tier (free included) signs in as: no plan grants
  // an admin role, so this one case covers the whole tier matrix.
  it('a normal (free-plan) user is refused and gets no cookie', async () => {
    const response = await mint(bearer(UserRole.USER));
    expect(response.status).toBe(403);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('an anonymous caller is refused and gets no cookie', async () => {
    const response = await mint();
    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('a garbage bearer token is refused', async () => {
    const response = await mint('Bearer not.a.token');
    expect(response.status).toBe(401);
  });
});

describe('GET /api/v1/auth/grafana-access/verify — what nginx auth_request asks', () => {
  it('lets an admin cookie through and names the admin for Grafana', async () => {
    const cookie = cookieFrom(await mint(bearer(UserRole.ADMIN)));
    const response = await verify(`theme=dark; ${cookie}`);
    expect(response.status).toBe(204);
    expect(response.headers.get('x-grafana-user')).toBe('admin@claw.local');
  });

  it('refuses a signed-out browser (no cookie)', async () => {
    const response = await verify();
    expect(response.status).toBe(401);
    expect(response.headers.get('x-grafana-user')).toBeNull();
  });

  it('refuses a non-admin who forges the cookie from their own access token', async () => {
    const accessToken = bearer(UserRole.USER).slice('Bearer '.length);
    const response = await verify(`claw_grafana=${accessToken}`);
    expect(response.status).toBe(401);
  });

  it('refuses the cookie once its session is signed out', async () => {
    const cookie = cookieFrom(await mint(bearer(UserRole.ADMIN, 'session-to-sign-out')));
    expect((await verify(cookie)).status).toBe(204);

    revoked.add('auth:revoked-session:session-to-sign-out');
    const response = await verify(cookie);
    expect(response.status).toBe(401);
  });
});
