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

const ROUTE_HANDLERS = [
  'getConfig',
  'getModelsSnapshot',
  'getHealthSnapshot',
  'getPaygPolicy',
  'validateExposedModels',
] as const;

function contextWith(authorization: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: authorization === undefined ? {} : { authorization } }),
    }),
  } as unknown as ExecutionContext;
}

/** Runs the controller's declared guards the way Nest does before any handler. */
function runClassGuards(authorization: string | undefined): void {
  const guards = Reflect.getMetadata(GUARDS_METADATA, ConnectorsInternalController) as Array<
    new () => ServiceTokenGuard
  >;
  for (const Guard of guards) {
    new Guard().canActivate(contextWith(authorization));
  }
}

/**
 * The handler only runs when the guards pass. The service behind it is a mock
 * that would hand back a plaintext key, so a response that escapes the guard
 * shows in the assertion.
 */
async function callConfigRoute(
  authorization: string | undefined,
  getConnectorConfig: Mock,
): Promise<unknown> {
  const controller = new ConnectorsInternalController({ getConnectorConfig } as never, {} as never);
  runClassGuards(authorization);
  return controller.getConfig('OPENAI');
}

describe('internal/connectors service-token guard (security audit 2026-11-27)', () => {
  let getConnectorConfig: Mock;

  beforeEach(() => {
    getConnectorConfig = vi.fn().mockResolvedValue({ apiKey: 'sk-plaintext-provider-key' });
  });

  it('declares ServiceTokenGuard on the controller, so every route requires it', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ConnectorsInternalController) as unknown[];
    expect(guards).toContain(ServiceTokenGuard);
  });

  it('covers models-snapshot, health-snapshot, payg-policy and validate-exposed, not only config', () => {
    // No handler declares its own guard list, so the class-level one is what
    // Nest runs for each; a method-level one would only duplicate it.
    for (const name of ROUTE_HANDLERS) {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        ConnectorsInternalController.prototype[name],
      ) as unknown[] | undefined;
      expect(guards, name).toBeUndefined();
    }
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
});
