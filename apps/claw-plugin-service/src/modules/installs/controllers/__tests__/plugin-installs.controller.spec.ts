import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Permission, UserRole } from '@claw/shared-types';

import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { ZodValidationPipe } from '../../../../app/pipes/zod-validation.pipe';
import {
  buildGuards,
  GUARD_SECRET,
  runGuards,
  signToken,
} from '../../../__tests__/controller-guards.fixture';
import { TOOL_NAME_PIPE } from '../../constants/install-pipes.constants';
import {
  type ConsentBody,
  consentBodySchema,
  credentialBodySchema,
  installBodySchema,
  installIdSchema,
  updateInstallBodySchema,
} from '../../dto/install.dto';
import { PluginInstallsController } from '../plugin-installs.controller';

const PROTO = PluginInstallsController.prototype;
const CALLER = { id: 'user-1', email: 'u@claw.local', role: UserRole.USER, sessionId: 's-1' };
const INSTALL_ID = '3f2b8f0e-9d3c-4c52-8c52-5d8f1b3a9a10';

const readHandlers = [
  ['list', PROTO.list],
  ['mentions', PROTO.mentions],
  ['get', PROTO.get],
] as const;
const writeHandlers = [
  ['install', PROTO.install],
  ['update', PROTO.update],
  ['remove', PROTO.remove],
  ['putCredential', PROTO.putCredential],
  ['removeCredential', PROTO.removeCredential],
  ['grantConsent', PROTO.grantConsent],
  ['revokeConsent', PROTO.revokeConsent],
] as const;

function buildController() {
  const installs = {
    list: vi.fn().mockResolvedValue(['list']),
    mentions: vi.fn().mockResolvedValue(['mentions']),
    get: vi.fn().mockResolvedValue('get'),
    install: vi.fn().mockResolvedValue('install'),
    update: vi.fn().mockResolvedValue('update'),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const credentials = {
    put: vi.fn().mockResolvedValue('put'),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const consents = {
    grant: vi.fn().mockResolvedValue('grant'),
    revoke: vi.fn().mockResolvedValue(undefined),
  };
  const controller = new PluginInstallsController(
    installs as never,
    credentials as never,
    consents as never,
  );
  return { controller, installs, credentials, consents };
}

describe('PluginInstallsController', () => {
  const previousSecret = process.env['JWT_SECRET'];

  beforeEach(() => {
    process.env['JWT_SECRET'] = GUARD_SECRET;
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env['JWT_SECRET'];
    else process.env['JWT_SECRET'] = previousSecret;
  });

  describe('permissions', () => {
    it.each(readHandlers)('%s needs PLUGINS_USE', (_name, handler) => {
      expect(Reflect.getMetadata('claw:require-permissions', handler)).toEqual([
        Permission.PLUGINS_USE,
      ]);
    });

    it.each(writeHandlers)('%s needs PLUGINS_INSTALL', (_name, handler) => {
      expect(Reflect.getMetadata('claw:require-permissions', handler)).toEqual([
        Permission.PLUGINS_INSTALL,
      ]);
    });
  });

  describe.each([...readHandlers, ...writeHandlers])('guards on %s', (_name, handler) => {
    const required = Reflect.getMetadata('claw:require-permissions', handler) as Permission[];

    it('answers 401 with no Authorization header', async () => {
      await expect(
        runGuards(buildGuards(required), PluginInstallsController, handler),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('answers 401 for a token signed with another secret', async () => {
      const token = signToken(UserRole.USER, 'another-secret-0123456789012345');

      await expect(
        runGuards(buildGuards(required), PluginInstallsController, handler, `Bearer ${token}`),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('answers 403 when the user lacks the permission', async () => {
      const guards = buildGuards([Permission.CHAT_USE]);

      const failure = await runGuards(
        guards,
        PluginInstallsController,
        handler,
        `Bearer ${signToken(UserRole.USER)}`,
      ).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ForbiddenException);
      expect((failure as ForbiddenException).getResponse()).toMatchObject({
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        requiredPermissions: required,
      });
    });

    it('lets a user holding the permission through', async () => {
      await expect(
        runGuards(
          buildGuards(required),
          PluginInstallsController,
          handler,
          `Bearer ${signToken(UserRole.USER)}`,
        ),
      ).resolves.toBe(true);
    });

    it('lets an admin through without asking auth-service', async () => {
      const guards = buildGuards([]);

      await expect(
        runGuards(guards, PluginInstallsController, handler, `Bearer ${signToken(UserRole.ADMIN)}`),
      ).resolves.toBe(true);
      expect(guards.adapter.getEntitlements).not.toHaveBeenCalled();
    });
  });

  it('a user holding only PLUGINS_USE cannot install, but can still read', async () => {
    const guards = buildGuards([Permission.PLUGINS_USE]);
    const bearer = `Bearer ${signToken(UserRole.USER)}`;

    await expect(
      runGuards(guards, PluginInstallsController, PROTO.install, bearer),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(runGuards(guards, PluginInstallsController, PROTO.list, bearer)).resolves.toBe(
      true,
    );
  });

  describe('delegation: the caller always comes from the token', () => {
    it('lists, reads and fetches mentions for the caller', async () => {
      const { controller, installs } = buildController();

      await controller.list(CALLER, 'fr');
      await controller.mentions(CALLER, undefined);
      await controller.get(CALLER, INSTALL_ID, 'de');

      expect(installs.list).toHaveBeenCalledWith('user-1', 'fr');
      expect(installs.mentions).toHaveBeenCalledWith('user-1', undefined);
      expect(installs.get).toHaveBeenCalledWith('user-1', INSTALL_ID, 'de');
    });

    it('installs, updates and removes as the caller', async () => {
      const { controller, installs } = buildController();

      await controller.install(CALLER, { slug: 'weather' }, 'en');
      await controller.update(CALLER, INSTALL_ID, { enabled: false }, 'en');
      await controller.remove(CALLER, INSTALL_ID);

      expect(installs.install).toHaveBeenCalledWith('user-1', { slug: 'weather' }, 'en');
      expect(installs.update).toHaveBeenCalledWith('user-1', INSTALL_ID, { enabled: false }, 'en');
      expect(installs.remove).toHaveBeenCalledWith('user-1', INSTALL_ID);
    });

    it('writes credentials and consents as the caller', async () => {
      const { controller, credentials, consents } = buildController();
      const credential = { kind: 'API_KEY', value: 'k' } as const;
      const consent: ConsentBody = { toolName: 'send', level: RiskLevel.WRITE };

      await controller.putCredential(CALLER, INSTALL_ID, credential);
      await controller.removeCredential(CALLER, INSTALL_ID);
      await controller.grantConsent(CALLER, INSTALL_ID, consent);
      await controller.revokeConsent(CALLER, INSTALL_ID, 'send');

      expect(credentials.put).toHaveBeenCalledWith('user-1', INSTALL_ID, credential);
      expect(credentials.remove).toHaveBeenCalledWith('user-1', INSTALL_ID);
      expect(consents.grant).toHaveBeenCalledWith('user-1', INSTALL_ID, consent);
      expect(consents.revoke).toHaveBeenCalledWith('user-1', INSTALL_ID, 'send');
    });
  });

  describe('routing and headers', () => {
    it('declares mentions before the :id route so it is never read as an id', () => {
      const names = Object.getOwnPropertyNames(PROTO);
      expect(names.indexOf('mentions')).toBeLessThan(names.indexOf('get'));
    });

    it('marks credential and install reads as not cacheable', () => {
      for (const handler of [PROTO.list, PROTO.mentions, PROTO.get, PROTO.putCredential]) {
        const headers = Reflect.getMetadata('__headers__', handler) as Array<{
          name: string;
          value: string;
        }>;
        expect(headers).toContainEqual({ name: 'Cache-Control', value: 'private, no-store' });
      }
    });

    it('answers 204 for delete and 200 for the consent grant', () => {
      expect(Reflect.getMetadata('__httpCode__', PROTO.remove)).toBe(204);
      expect(Reflect.getMetadata('__httpCode__', PROTO.removeCredential)).toBe(204);
      expect(Reflect.getMetadata('__httpCode__', PROTO.grantConsent)).toBe(200);
      expect(Reflect.getMetadata('__httpCode__', PROTO.revokeConsent)).toBe(204);
    });
  });

  describe('input validation', () => {
    it('rejects an install id that is not a uuid before it reaches the service', () => {
      const pipe = new ZodValidationPipe(installIdSchema);

      for (const id of ['mentions', '../x', "1'; drop", '']) {
        expect(() => pipe.transform(id, { type: 'param' })).toThrow(BadRequestException);
      }
      expect(pipe.transform(INSTALL_ID, { type: 'param' })).toBe(INSTALL_ID);
    });

    it('checks the install body strictly', () => {
      expect(installBodySchema.safeParse({ slug: 'weather' }).success).toBe(true);
      expect(installBodySchema.safeParse({ slug: 'weather', version: '1.0.0' }).success).toBe(true);
      expect(installBodySchema.safeParse({ slug: 'Weather' }).success).toBe(false);
      expect(installBodySchema.safeParse({ slug: 'weather', version: 'latest' }).success).toBe(
        false,
      );
      expect(installBodySchema.safeParse({ slug: 'weather', userId: 'someone-else' }).success).toBe(
        false,
      );
      expect(installBodySchema.safeParse({}).success).toBe(false);
    });

    it('needs at least one change on update, and nothing else', () => {
      expect(updateInstallBodySchema.safeParse({}).success).toBe(false);
      expect(updateInstallBodySchema.safeParse({ enabled: true }).success).toBe(true);
      expect(updateInstallBodySchema.safeParse({ settings: { units: 'metric' } }).success).toBe(
        true,
      );
      expect(updateInstallBodySchema.safeParse({ enabled: 'yes' }).success).toBe(false);
      expect(updateInstallBodySchema.safeParse({ enabled: true, status: 'x' }).success).toBe(false);
    });

    it('bounds the credential body and never echoes the value in an error', () => {
      expect(credentialBodySchema.safeParse({ kind: 'API_KEY', value: 'k' }).success).toBe(true);
      expect(credentialBodySchema.safeParse({ kind: 'BEARER', value: 'k' }).success).toBe(false);
      expect(credentialBodySchema.safeParse({ kind: 'API_KEY', value: '' }).success).toBe(false);
      expect(
        credentialBodySchema.safeParse({ kind: 'API_KEY', value: 'x'.repeat(4097) }).success,
      ).toBe(false);
      expect(
        credentialBodySchema.safeParse({ kind: 'API_KEY', value: 'k', headerName: 'Bad Header' })
          .success,
      ).toBe(false);
      const pipe = new ZodValidationPipe(credentialBodySchema);
      let message = '';
      try {
        pipe.transform({ kind: 'API_KEY', value: 'SECRET-'.repeat(700) }, { type: 'body' });
      } catch (error) {
        message = JSON.stringify((error as BadRequestException).getResponse());
      }
      expect(message).not.toContain('SECRET-');
    });

    it('rejects a tool name in the revoke path that is not a valid tool name', () => {
      for (const name of ['Send!', '../x', 'a'.repeat(41), '']) {
        expect(() => TOOL_NAME_PIPE.transform(name, { type: 'param' })).toThrow(
          BadRequestException,
        );
      }
      expect(TOOL_NAME_PIPE.transform('send_mail', { type: 'param' })).toBe('send_mail');
    });

    it('accepts WRITE and DESTRUCTIVE consents only', () => {
      expect(consentBodySchema.safeParse({ toolName: 'send', level: 'WRITE' }).success).toBe(true);
      expect(consentBodySchema.safeParse({ toolName: 'send', level: 'DESTRUCTIVE' }).success).toBe(
        true,
      );
      expect(consentBodySchema.safeParse({ toolName: 'send', level: 'READ' }).success).toBe(false);
      expect(consentBodySchema.safeParse({ toolName: 'Send!', level: 'WRITE' }).success).toBe(
        false,
      );
    });
  });
});
