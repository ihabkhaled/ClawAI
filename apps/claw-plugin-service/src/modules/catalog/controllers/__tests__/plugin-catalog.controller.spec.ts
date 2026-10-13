import { createHmac } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@claw/shared-auth';
import { PermissionGuard } from '@claw/shared-entitlements';
import { Permission, UserRole } from '@claw/shared-types';

import { ZodValidationPipe } from '../../../../app/pipes/zod-validation.pipe';
import {
  catalogDetailQuerySchema,
  catalogListQuerySchema,
  catalogSlugSchema,
} from '../../dto/catalog-query.dto';
import { PluginCatalogController } from '../plugin-catalog.controller';

const CALLER = { id: 'user-1', email: 'user@claw.local', role: UserRole.USER, sessionId: 's-1' };
const SECRET = 'plugin-service-test-secret-0123456789';

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function signToken(role: UserRole, secret = SECRET): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(
    JSON.stringify({
      sub: 'user-1',
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

function contextFor(
  handler: (...args: never[]) => unknown,
  authorization?: string,
): { context: never; request: Record<string, unknown> } {
  const request: Record<string, unknown> = {
    headers: authorization === undefined ? {} : { authorization },
    method: 'GET',
    url: '/api/v1/plugins/catalog',
  };
  const context = {
    getHandler: () => handler,
    getClass: () => PluginCatalogController,
    switchToHttp: () => ({ getRequest: () => request }),
  };
  return { context: context as never, request };
}

function buildGuards(permissions: Permission[], failResolution = false) {
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

async function runGuards(
  guards: ReturnType<typeof buildGuards>,
  handler: (...args: never[]) => unknown,
  authorization?: string,
): Promise<boolean> {
  const { context } = contextFor(handler, authorization);
  guards.auth.canActivate(context);
  return guards.permission.canActivate(context);
}

describe('PluginCatalogController', () => {
  const previousSecret = process.env['JWT_SECRET'];
  const handlers = [
    ['list', PluginCatalogController.prototype.list],
    ['detail', PluginCatalogController.prototype.detail],
  ] as const;

  beforeEach(() => {
    process.env['JWT_SECRET'] = SECRET;
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env['JWT_SECRET'];
    else process.env['JWT_SECRET'] = previousSecret;
  });

  describe.each(handlers)('guards on %s', (_name, handler) => {
    it('answers 401 with no Authorization header', async () => {
      await expect(
        runGuards(buildGuards([Permission.PLUGINS_USE]), handler),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('answers 401 for a malformed header, a bad signature and a wrong scheme', async () => {
      const guards = buildGuards([Permission.PLUGINS_USE]);

      await expect(runGuards(guards, handler, 'Bearer')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(
        runGuards(
          guards,
          handler,
          `Bearer ${signToken(UserRole.USER, 'another-secret-0123456789012345')}`,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(
        runGuards(guards, handler, `Basic ${signToken(UserRole.USER)}`),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(guards.adapter.getEntitlements).not.toHaveBeenCalled();
    });

    it('answers 403 INSUFFICIENT_PERMISSIONS when the user lacks PLUGINS_USE', async () => {
      const guards = buildGuards([Permission.CHAT_USE]);

      const failure = await runGuards(guards, handler, `Bearer ${signToken(UserRole.USER)}`).catch(
        (error: unknown) => error,
      );

      expect(failure).toBeInstanceOf(ForbiddenException);
      expect((failure as ForbiddenException).getResponse()).toMatchObject({
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        missingPermissions: [Permission.PLUGINS_USE],
        requiredPermissions: [Permission.PLUGINS_USE],
      });
    });

    it('lets a user holding PLUGINS_USE through', async () => {
      const guards = buildGuards([Permission.PLUGINS_USE]);

      await expect(runGuards(guards, handler, `Bearer ${signToken(UserRole.USER)}`)).resolves.toBe(
        true,
      );
      expect(guards.adapter.getEntitlements).toHaveBeenCalledWith('user-1', {
        enforceTrial: false,
      });
    });

    it('lets an admin through without asking auth-service', async () => {
      const guards = buildGuards([]);

      await expect(runGuards(guards, handler, `Bearer ${signToken(UserRole.ADMIN)}`)).resolves.toBe(
        true,
      );
      expect(guards.adapter.getEntitlements).not.toHaveBeenCalled();
    });

    it('fails closed with 503 when permissions cannot be resolved', async () => {
      const guards = buildGuards([], true);

      await expect(
        runGuards(guards, handler, `Bearer ${signToken(UserRole.USER)}`),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('is per-user: private, no-store, and varies on language and credentials', () => {
      const headers = Reflect.getMetadata('__headers__', handler) as Array<{
        name: string;
        value: string;
      }>;

      expect(headers).toEqual(
        expect.arrayContaining([
          { name: 'Cache-Control', value: 'private, no-store' },
          { name: 'Vary', value: 'Accept-Language, Authorization' },
        ]),
      );
    });
  });

  describe('delegation', () => {
    it('passes the query and Accept-Language to the service for the list', async () => {
      const page = { items: [], nextCursor: null };
      const catalog = { list: vi.fn().mockResolvedValue(page), detail: vi.fn() };
      const controller = new PluginCatalogController(catalog as never);
      const query = catalogListQuerySchema.parse({ q: 'web' });

      await expect(controller.list(CALLER, query, 'fr-FR')).resolves.toBe(page);
      expect(catalog.list).toHaveBeenCalledWith('user-1', { q: 'web', limit: 20 }, 'fr-FR');
    });

    it('passes slug, query and Accept-Language to the service for the detail', async () => {
      const detail = { slug: 'weather' };
      const catalog = { list: vi.fn(), detail: vi.fn().mockResolvedValue(detail) };
      const controller = new PluginCatalogController(catalog as never);

      await expect(controller.detail(CALLER, 'weather', { locale: undefined }, 'de')).resolves.toBe(
        detail,
      );
      expect(catalog.detail).toHaveBeenCalledWith('user-1', 'weather', { locale: undefined }, 'de');
    });

    it('requires the PLUGINS_USE permission on the whole controller', () => {
      expect(Reflect.getMetadata('claw:require-permissions', PluginCatalogController)).toEqual([
        Permission.PLUGINS_USE,
      ]);
    });
  });

  describe('input validation', () => {
    it('rejects a malformed slug before it reaches the service', () => {
      const pipe = new ZodValidationPipe(catalogSlugSchema);

      for (const slug of ['../etc/passwd', 'UPPER', 'a', 'x'.repeat(41), 'a b', "web';drop"]) {
        expect(() => pipe.transform(slug, { type: 'param' })).toThrow(BadRequestException);
      }
      expect(pipe.transform('web-fetch', { type: 'param' })).toBe('web-fetch');
    });

    it('defaults and bounds the list query', () => {
      expect(catalogListQuerySchema.parse({})).toEqual({ limit: 20 });
      expect(catalogListQuerySchema.parse({ limit: '50' }).limit).toBe(50);
      expect(catalogListQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
      expect(catalogListQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
      expect(catalogListQuerySchema.safeParse({ limit: 'abc' }).success).toBe(false);
      expect(catalogListQuerySchema.safeParse({ q: 'x'.repeat(81) }).success).toBe(false);
      expect(catalogListQuerySchema.safeParse({ category: 'Not A Key' }).success).toBe(false);
      expect(catalogListQuerySchema.safeParse({ cursor: '../x' }).success).toBe(false);
      expect(catalogListQuerySchema.safeParse({ locale: 'xx' }).success).toBe(false);
      expect(catalogListQuerySchema.parse({ locale: 'ar' }).locale).toBe('ar');
    });

    it('trims the search text', () => {
      expect(catalogListQuerySchema.parse({ q: '  weather  ' }).q).toBe('weather');
    });

    it('accepts only a supported locale on the detail query', () => {
      expect(catalogDetailQuerySchema.parse({ locale: 'ja' }).locale).toBe('ja');
      expect(catalogDetailQuerySchema.safeParse({ locale: 'klingon' }).success).toBe(false);
    });
  });
});
