import { BillingGateway } from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import { GatewayConfigErrorCode } from '../../enums/gateway-config-error-code.enum';
import { GatewayConfigBootstrapService } from '../gateway-config-bootstrap.service';

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: jest.fn() },
}));

describe('GatewayConfigBootstrapService', () => {
  const repository = { importEnvironmentOnce: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(AppConfig.get).mockReturnValue({
      PAYMENT_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
      PAYMENT_TOKEN_KEY_VERSION: 4,
      PAYPAL_CLIENT_ID: 'paypal-client',
      PAYPAL_CLIENT_SECRET: 'paypal-secret',
      PAYPAL_WEBHOOK_ID: 'paypal-webhook',
      PAYPAL_ENV: 'live',
      PAYMOB_SECRET_KEY: undefined,
      PAYMOB_PUBLIC_KEY: undefined,
      PAYMOB_API_KEY: undefined,
      PAYMOB_HMAC_SECRET: undefined,
      PAYMOB_CARD_INTEGRATION_ID: undefined,
      PAYMOB_WEBHOOK_URL: undefined,
      PAYMOB_CURRENCY: 'EGP',
    } as ReturnType<typeof AppConfig.get>);
  });

  it('submits encrypted provider rows to the idempotent repository claim', async () => {
    repository.importEnvironmentOnce.mockResolvedValue('APPLIED');
    const service = new GatewayConfigBootstrapService(repository as never);

    await service.onModuleInit();

    const input = repository.importEnvironmentOnce.mock.calls[0]?.[0];
    expect(input.configurations).toHaveLength(2);
    expect(input.configurations[0]).toMatchObject({
      gateway: BillingGateway.PAYPAL,
      isEnabled: true,
      mode: 'LIVE',
    });
    expect(JSON.stringify(input)).not.toContain('paypal-secret');
  });

  it('accepts an already-applied bootstrap without rewriting rows', async () => {
    repository.importEnvironmentOnce.mockResolvedValue('ALREADY_APPLIED');
    const service = new GatewayConfigBootstrapService(repository as never);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('fails startup when a completed seed version has a different checksum', async () => {
    repository.importEnvironmentOnce.mockResolvedValue('CHECKSUM_MISMATCH');
    const service = new GatewayConfigBootstrapService(repository as never);

    await expect(service.onModuleInit()).rejects.toMatchObject({
      code: GatewayConfigErrorCode.SEED_CHECKSUM_MISMATCH,
    });
  });
});
