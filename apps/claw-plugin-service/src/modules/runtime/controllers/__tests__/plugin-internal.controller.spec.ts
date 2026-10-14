import { IS_PUBLIC_KEY } from '@claw/shared-auth';
import { EventEmitter } from 'node:events';

import { ServiceTokenGuard } from '../../../../app/guards/service-token.guard';
import { ZodValidationPipe } from '../../../../app/pipes/zod-validation.pipe';
import { internalInvokeBodySchema, internalResolveBodySchema } from '../../dto/internal-plugin.dto';
import { PluginInternalController } from '../plugin-internal.controller';

const INSTALL = '3f2b8f0e-9d3c-4c52-8c52-5d8f1b3a9a10';
const SERVER = '7a1c2d3e-4b5f-4a6b-8c7d-9e0f1a2b3c4d';
const BODY = {
  userId: 'user-1',
  installId: INSTALL,
  toolName: 'get_weather',
  args: { location: 'Cairo' },
  callId: 'chat-0123456789',
  surface: 'chat',
};

class FakeResponse extends EventEmitter {
  writableFinished = false;
}

describe('PluginInternalController', () => {
  it('is public to the user guards and behind the service token guard', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PluginInternalController)).toBe(true);
    expect(Reflect.getMetadata('__guards__', PluginInternalController)).toContain(
      ServiceTokenGuard,
    );
  });

  it('resolves through the resolve service', async () => {
    const resolveService = { resolve: vi.fn().mockResolvedValue({ tools: [] }) };
    const controller = new PluginInternalController(resolveService as never, {} as never);
    const body = internalResolveBodySchema.parse({
      userId: 'user-1',
      refs: [{ installId: INSTALL }],
    });
    await controller.resolve(body);
    expect(resolveService.resolve).toHaveBeenCalledWith(body);
  });

  it('runs the call for the owner named in the body and keeps the owner out of the call', async () => {
    const invokeService = { invoke: vi.fn().mockResolvedValue({ status: 'OK' }) };
    const controller = new PluginInternalController({} as never, invokeService as never);
    await controller.invoke(internalInvokeBodySchema.parse(BODY), new FakeResponse() as never);
    const [userId, call, signal] = invokeService.invoke.mock.calls[0] as [
      string,
      object,
      AbortSignal,
    ];
    expect(userId).toBe('user-1');
    expect(call).not.toHaveProperty('userId');
    expect(call).toMatchObject({ installId: INSTALL, toolName: 'get_weather' });
    expect(signal.aborted).toBe(false);
  });

  it('aborts a running tool when the caller disconnects', async () => {
    const invokeService = { invoke: vi.fn().mockResolvedValue({ status: 'OK' }) };
    const controller = new PluginInternalController({} as never, invokeService as never);
    const response = new FakeResponse();
    await controller.invoke(internalInvokeBodySchema.parse(BODY), response as never);
    const signal = invokeService.invoke.mock.calls[0]?.[2] as AbortSignal;
    response.emit('close');
    expect(signal.aborted).toBe(true);
  });
});

describe('internal plugin bodies', () => {
  const pipe = new ZodValidationPipe(internalInvokeBodySchema);
  const meta = { type: 'body' } as never;

  it('requires the owner id and exactly one target', () => {
    expect(() => pipe.transform({ ...BODY, userId: undefined }, meta)).toThrow();
    expect(() => pipe.transform({ ...BODY, serverId: SERVER }, meta)).toThrow();
    expect(() => pipe.transform({ ...BODY, installId: undefined }, meta)).toThrow();
    expect(() =>
      pipe.transform({ ...BODY, installId: undefined, serverId: SERVER }, meta),
    ).not.toThrow();
  });

  it('rejects unknown fields and an upper-case surface', () => {
    expect(() => pipe.transform({ ...BODY, extra: 1 }, meta)).toThrow();
    expect(() => pipe.transform({ ...BODY, surface: 'CHAT' }, meta)).toThrow();
  });

  it('caps the mentions at five and rejects non-uuid installs', () => {
    const resolvePipe = new ZodValidationPipe(internalResolveBodySchema);
    const refs = Array.from({ length: 6 }, () => ({ installId: INSTALL }));
    expect(() => resolvePipe.transform({ userId: 'u', refs }, meta)).toThrow();
    expect(() =>
      resolvePipe.transform({ userId: 'u', refs: [{ installId: 'nope' }] }, meta),
    ).toThrow();
  });
});
