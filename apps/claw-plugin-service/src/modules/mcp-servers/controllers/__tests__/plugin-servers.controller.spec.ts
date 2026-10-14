import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Permission, UserRole } from '@claw/shared-types';

import { AuthKind } from '../../../../common/enums/auth-kind.enum';
import { RiskLevel } from '../../../../common/enums/risk-level.enum';
import { ZodValidationPipe } from '../../../../app/pipes/zod-validation.pipe';
import {
  buildGuards,
  GUARD_SECRET,
  runGuards,
  signToken,
} from '../../../__tests__/controller-guards.fixture';
import { SERVER_ID_PIPE } from '../../constants/server-pipes.constants';
import {
  approveChangesBodySchema,
  registerServerBodySchema,
  serverCredentialBodySchema,
  updateServerBodySchema,
} from '../../dto/mcp-server.dto';
import { PluginServersController } from '../plugin-servers.controller';

const PROTO = PluginServersController.prototype;
const CALLER = { id: 'user-1', email: 'u@claw.local', role: UserRole.USER, sessionId: 's-1' };
const SERVER_ID = '3f2b8f0e-9d3c-4c52-8c52-5d8f1b3a9a10';
const HANDLERS = [
  ['list', PROTO.list],
  ['register', PROTO.register],
  ['get', PROTO.get],
  ['update', PROTO.update],
  ['remove', PROTO.remove],
  ['putCredential', PROTO.putCredential],
  ['removeCredential', PROTO.removeCredential],
  ['refresh', PROTO.refresh],
  ['approveChanges', PROTO.approveChanges],
] as const;

function buildController() {
  const servers = {
    list: vi.fn().mockResolvedValue(['list']),
    register: vi.fn().mockResolvedValue('register'),
    get: vi.fn().mockResolvedValue('get'),
    update: vi.fn().mockResolvedValue('update'),
    remove: vi.fn().mockResolvedValue(undefined),
    putCredential: vi.fn().mockResolvedValue('put'),
    removeCredential: vi.fn().mockResolvedValue(undefined),
  };
  const review = {
    refresh: vi.fn().mockResolvedValue('refresh'),
    approveChanges: vi.fn().mockResolvedValue('approve'),
  };
  return {
    controller: new PluginServersController(servers as never, review as never),
    servers,
    review,
  };
}

describe('PluginServersController', () => {
  const previousSecret = process.env['JWT_SECRET'];

  beforeEach(() => {
    process.env['JWT_SECRET'] = GUARD_SECRET;
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env['JWT_SECRET'];
    else process.env['JWT_SECRET'] = previousSecret;
  });

  it.each(HANDLERS)('%s needs PLUGINS_MANAGE_OWN_SERVERS', (_name, handler) => {
    expect(Reflect.getMetadata('claw:require-permissions', handler)).toEqual([
      Permission.PLUGINS_MANAGE_OWN_SERVERS,
    ]);
  });

  it('answers 401 without a token, 403 without the permission and lets the right user in', async () => {
    const required = [Permission.PLUGINS_MANAGE_OWN_SERVERS];

    await expect(
      runGuards(buildGuards(required), PluginServersController, PROTO.list),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      runGuards(
        buildGuards([Permission.PLUGINS_USE, Permission.PLUGINS_INSTALL]),
        PluginServersController,
        PROTO.register,
        `Bearer ${signToken(UserRole.USER)}`,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      runGuards(
        buildGuards(required),
        PluginServersController,
        PROTO.register,
        `Bearer ${signToken(UserRole.USER)}`,
      ),
    ).resolves.toBe(true);
  });

  it('rate limits the two routes that open a connection', () => {
    for (const handler of [PROTO.register, PROTO.refresh]) {
      const keys = Reflect.getMetadataKeys(handler).map(String);
      expect(keys.some((key) => key.includes('THROTTLER'))).toBe(true);
    }
  });

  it('sends no-store on every route that returns server data', () => {
    for (const [, handler] of HANDLERS.filter(
      ([name]) => name !== 'remove' && name !== 'removeCredential',
    )) {
      expect(Reflect.getMetadata('__headers__', handler)).toEqual([
        { name: 'Cache-Control', value: 'private, no-store' },
      ]);
    }
  });

  describe('delegation: the caller always comes from the token', () => {
    it('passes the JWT user id to every service call', async () => {
      const { controller, servers, review } = buildController();
      const register = {
        name: 'n',
        url: 'https://mcp.example.com/mcp',
        authKind: AuthKind.NONE,
      } as never;

      await controller.list(CALLER);
      await controller.register(CALLER, register);
      await controller.get(CALLER, SERVER_ID);
      await controller.update(CALLER, SERVER_ID, { name: 'x' });
      await controller.remove(CALLER, SERVER_ID);
      await controller.putCredential(CALLER, SERVER_ID, { value: 'k' });
      await controller.removeCredential(CALLER, SERVER_ID);
      await controller.refresh(CALLER, SERVER_ID);
      await controller.approveChanges(CALLER, SERVER_ID, { toolsHash: 'a'.repeat(64) });

      expect(servers.list).toHaveBeenCalledWith('user-1');
      expect(servers.register).toHaveBeenCalledWith('user-1', register);
      expect(servers.get).toHaveBeenCalledWith('user-1', SERVER_ID);
      expect(servers.update).toHaveBeenCalledWith('user-1', SERVER_ID, { name: 'x' });
      expect(servers.remove).toHaveBeenCalledWith('user-1', SERVER_ID);
      expect(servers.putCredential).toHaveBeenCalledWith('user-1', SERVER_ID, { value: 'k' });
      expect(servers.removeCredential).toHaveBeenCalledWith('user-1', SERVER_ID);
      expect(review.refresh).toHaveBeenCalledWith('user-1', SERVER_ID);
      expect(review.approveChanges).toHaveBeenCalledWith('user-1', SERVER_ID, {
        toolsHash: 'a'.repeat(64),
      });
    });
  });

  describe('request validation', () => {
    const body = new ZodValidationPipe(registerServerBodySchema);

    it('accepts a server with no credential and one with an API key', () => {
      expect(() =>
        body.transform(
          { name: 'n', url: 'https://a.example.com/', authKind: 'NONE' },
          { type: 'body' },
        ),
      ).not.toThrow();
      expect(() =>
        body.transform(
          {
            name: 'n',
            url: 'https://a.example.com/',
            authKind: 'API_KEY',
            credential: { value: 'abc123' },
          },
          { type: 'body' },
        ),
      ).not.toThrow();
    });

    it.each([
      [
        'a credential with NONE',
        { name: 'n', url: 'https://a.example.com/', authKind: 'NONE', credential: { value: 'x' } },
      ],
      [
        'no credential with API_KEY',
        { name: 'n', url: 'https://a.example.com/', authKind: 'API_KEY' },
      ],
      [
        'OAUTH2_PKCE (not supported here)',
        { name: 'n', url: 'https://a.example.com/', authKind: 'OAUTH2_PKCE' },
      ],
      [
        'an unknown field',
        { name: 'n', url: 'https://a.example.com/', authKind: 'NONE', ownerUserId: 'someone-else' },
      ],
      [
        'a spaced secret',
        {
          name: 'n',
          url: 'https://a.example.com/',
          authKind: 'API_KEY',
          credential: { value: 'a b' },
        },
      ],
      [
        'a header-injection secret',
        {
          name: 'n',
          url: 'https://a.example.com/',
          authKind: 'API_KEY',
          credential: { value: 'a\r\nHost: x' },
        },
      ],
      ['a multi-line name', { name: 'a\nb', url: 'https://a.example.com/', authKind: 'NONE' }],
      ['an empty name', { name: ' ', url: 'https://a.example.com/', authKind: 'NONE' }],
      [
        'a URL over 2048 characters',
        { name: 'n', url: `https://a.example.com/${'x'.repeat(2100)}`, authKind: 'NONE' },
      ],
      [
        'a header name with a colon',
        {
          name: 'n',
          url: 'https://a.example.com/',
          authKind: 'API_KEY',
          credential: { value: 'k', headerName: 'X:Y' },
        },
      ],
    ])('rejects %s with 400', (_name, payload) => {
      expect(() => body.transform(payload, { type: 'body' })).toThrow(BadRequestException);
    });

    it('requires something to change on PATCH and refuses an unknown risk level', () => {
      const pipe = new ZodValidationPipe(updateServerBodySchema);

      expect(() => pipe.transform({}, { type: 'body' })).toThrow(BadRequestException);
      expect(() =>
        pipe.transform({ tools: [{ name: 'a', riskLevel: 'SAFE' }] }, { type: 'body' }),
      ).toThrow(BadRequestException);
      expect(() =>
        pipe.transform({ tools: [{ name: 'a', riskLevel: RiskLevel.READ }] }, { type: 'body' }),
      ).not.toThrow();
    });

    it('checks credential and approval bodies and the server id', () => {
      expect(() =>
        new ZodValidationPipe(serverCredentialBodySchema).transform(
          { value: '' },
          { type: 'body' },
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        new ZodValidationPipe(approveChangesBodySchema).transform(
          { toolsHash: 'nope' },
          { type: 'body' },
        ),
      ).toThrow(BadRequestException);
      expect(() => SERVER_ID_PIPE.transform('not-a-uuid', { type: 'param' })).toThrow(
        BadRequestException,
      );
      expect(SERVER_ID_PIPE.transform(SERVER_ID, { type: 'param' })).toBe(SERVER_ID);
    });
  });
});
