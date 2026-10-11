import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { type Mock, vi } from 'vitest';
import { ServiceTokenGuard } from '../../../../app/guards/service-token.guard';
import { ConnectorsInternalController } from '../connectors-internal.controller';

const TOKEN = 'k3Jx9Qm2Vb7LwZp4Tn8Rc5Yd1Hs6Gf0A-service-token';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: vi.fn().mockReturnValue({
      INTER_SERVICE_AUTH_TOKEN: 'k3Jx9Qm2Vb7LwZp4Tn8Rc5Yd1Hs6Gf0A-service-token',
    }),
  },
}));

function contextWith(authorization: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: authorization === undefined ? {} : { authorization } }),
    }),
  } as unknown as ExecutionContext;
}

/**
 * Runs the route the way Nest does: the declared guards first, the handler only
 * when they pass. The service behind the handler is a mock that would hand back
 * a plaintext key, so a response that escapes the guard shows in the assertion.
 */
async function callConfigRoute(
  authorization: string | undefined,
  getConnectorConfig: Mock,
): Promise<unknown> {
  const controller = new ConnectorsInternalController({ getConnectorConfig } as never, {} as never);
  const guards = Reflect.getMetadata(
    GUARDS_METADATA,
    ConnectorsInternalController.prototype.getConfig,
  ) as Array<new () => ServiceTokenGuard>;
  for (const Guard of guards) {
    new Guard().canActivate(contextWith(authorization));
  }
  return controller.getConfig('OPENAI');
}

describe('GET internal/connectors/config service-token guard', () => {
  let getConnectorConfig: Mock;

  beforeEach(() => {
    getConnectorConfig = vi.fn().mockResolvedValue({ apiKey: 'sk-plaintext-provider-key' });
  });

  it('declares ServiceTokenGuard on the config route', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ConnectorsInternalController.prototype.getConfig,
    ) as unknown[];
    expect(guards).toContain(ServiceTokenGuard);
  });

  it('rejects a request with no Authorization header and never reads the key', async () => {
    await expect(callConfigRoute(undefined, getConnectorConfig)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(getConnectorConfig).not.toHaveBeenCalled();
  });

  it('rejects a Bearer (user-style) header', async () => {
    await expect(callConfigRoute(`Bearer ${TOKEN}`, getConnectorConfig)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(getConnectorConfig).not.toHaveBeenCalled();
  });

  it('rejects a wrong service token', async () => {
    await expect(callConfigRoute('Service wrong-token', getConnectorConfig)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(getConnectorConfig).not.toHaveBeenCalled();
  });

  it('rejects the published placeholder token', async () => {
    await expect(
      callConfigRoute('Service change-me-inter-service-token-32-chars-min', getConnectorConfig),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(getConnectorConfig).not.toHaveBeenCalled();
  });

  it('serves the config with the right service token', async () => {
    await expect(callConfigRoute(`Service ${TOKEN}`, getConnectorConfig)).resolves.toEqual({
      apiKey: 'sk-plaintext-provider-key',
    });
    expect(getConnectorConfig).toHaveBeenCalledWith('OPENAI');
  });

  it('leaves the secret-free sibling routes without the guard', () => {
    for (const name of ['getModelsSnapshot', 'getHealthSnapshot', 'getPaygPolicy'] as const) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        ConnectorsInternalController.prototype[name],
      ) as unknown[] | undefined;
      expect(guards).toBeUndefined();
    }
  });
});
