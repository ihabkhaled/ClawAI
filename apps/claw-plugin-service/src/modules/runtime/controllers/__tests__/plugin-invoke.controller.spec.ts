import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Permission, UserRole } from '@claw/shared-types';
import { EventEmitter } from 'node:events';

import { ZodValidationPipe } from '../../../../app/pipes/zod-validation.pipe';
import {
  buildGuards,
  GUARD_SECRET,
  runGuards,
  signToken,
} from '../../../__tests__/controller-guards.fixture';
import { invokeBodySchema } from '../../dto/invoke.dto';
import { PluginInvokeController } from '../plugin-invoke.controller';

const PROTO = PluginInvokeController.prototype;
const CALLER = { id: 'user-1', email: 'u@claw.local', role: UserRole.USER, sessionId: 's-1' };
const INSTALL_ID = '3f2b8f0e-9d3c-4c52-8c52-5d8f1b3a9a10';
const SERVER_ID = '7a1c2d3e-4b5f-4a6b-8c7d-9e0f1a2b3c4d';
const BODY = {
  installId: INSTALL_ID,
  toolName: 'get_weather',
  args: { location: 'Cairo' },
  callId: 'call-0123456789',
};

class FakeResponse extends EventEmitter {
  writableFinished = false;
}

describe('PluginInvokeController', () => {
  const previousSecret = process.env['JWT_SECRET'];

  beforeEach(() => {
    process.env['JWT_SECRET'] = GUARD_SECRET;
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env['JWT_SECRET'];
    else process.env['JWT_SECRET'] = previousSecret;
  });

  it('needs PLUGINS_USE, answers 200 and is never cached', () => {
    expect(Reflect.getMetadata('claw:require-permissions', PROTO.invoke)).toEqual([
      Permission.PLUGINS_USE,
    ]);
    expect(Reflect.getMetadata('__httpCode__', PROTO.invoke)).toBe(200);
    expect(Reflect.getMetadata('__headers__', PROTO.invoke)).toEqual([
      { name: 'Cache-Control', value: 'no-store' },
    ]);
  });

  it('answers 401 without a token, 403 without the permission, and lets PLUGINS_USE through', async () => {
    await expect(
      runGuards(buildGuards([Permission.PLUGINS_USE]), PluginInvokeController, PROTO.invoke),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      runGuards(
        buildGuards([Permission.PLUGINS_INSTALL]),
        PluginInvokeController,
        PROTO.invoke,
        `Bearer ${signToken(UserRole.USER)}`,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      runGuards(
        buildGuards([Permission.PLUGINS_USE]),
        PluginInvokeController,
        PROTO.invoke,
        `Bearer ${signToken(UserRole.USER)}`,
      ),
    ).resolves.toBe(true);
  });

  it('runs the call for the JWT user', async () => {
    const service = { invoke: vi.fn().mockResolvedValue({ status: 'OK' }) };
    const controller = new PluginInvokeController(service as never);

    const result = await controller.invoke(CALLER, BODY as never, new FakeResponse() as never);

    expect(result).toEqual({ status: 'OK' });
    expect(service.invoke).toHaveBeenCalledWith('user-1', BODY, expect.any(AbortSignal));
  });

  it('aborts the running tool when the client disconnects before the answer is finished', () => {
    const service = { invoke: vi.fn().mockResolvedValue({}) };
    const response = new FakeResponse();
    void new PluginInvokeController(service as never).invoke(
      CALLER,
      BODY as never,
      response as never,
    );
    const signal = service.invoke.mock.calls[0]?.[2] as AbortSignal;

    expect(signal.aborted).toBe(false);
    response.emit('close');

    expect(signal.aborted).toBe(true);
  });

  it('does not abort once the answer was fully written', () => {
    const service = { invoke: vi.fn().mockResolvedValue({}) };
    const response = new FakeResponse();
    void new PluginInvokeController(service as never).invoke(
      CALLER,
      BODY as never,
      response as never,
    );
    const signal = service.invoke.mock.calls[0]?.[2] as AbortSignal;

    response.writableFinished = true;
    response.emit('close');

    expect(signal.aborted).toBe(false);
  });

  describe('request validation', () => {
    const pipe = new ZodValidationPipe(invokeBodySchema);
    const check = (value: unknown): unknown => pipe.transform(value, { type: 'body' });

    it('fills the defaults', () => {
      expect(check(BODY)).toMatchObject({ surface: 'chat', tainted: false, userApproved: false });
      expect(check({ ...BODY, args: undefined })).toMatchObject({ args: {} });
    });

    it('accepts a server target', () => {
      expect(() =>
        check({ serverId: SERVER_ID, toolName: 'create_issue', callId: 'call-0123456789' }),
      ).not.toThrow();
    });

    it.each([
      ['both targets', { ...BODY, serverId: SERVER_ID }],
      ['no target', { toolName: 'a', callId: 'call-0123456789' }],
      ['a user id in the body', { ...BODY, userId: 'someone-else' }],
      ['a non-uuid install', { ...BODY, installId: 'abc' }],
      ['a short call id', { ...BODY, callId: 'short' }],
      ['a call id with spaces', { ...BODY, callId: 'call id with spaces' }],
      ['a tool name with a dash', { ...BODY, toolName: 'get-weather' }],
      ['args that are an array', { ...BODY, args: [] }],
      ['a bad surface', { ...BODY, surface: 'Chat Window' }],
      ['tainted as a string', { ...BODY, tainted: 'yes' }],
      ['an unknown field', { ...BODY, role: 'ADMIN' }],
    ])('rejects %s with 400', (_name, payload) => {
      expect(() => check(payload)).toThrow(BadRequestException);
    });
  });
});
