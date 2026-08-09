import { BillingErrorCode, BillingGateway } from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import { encryptGatewayToken } from '../../../../common/utilities/token-vault.utility';
import { GatewayCredentialField } from '../../enums/gateway-credential-field.enum';
import { GatewayMode } from '../../enums/gateway-mode.enum';
import { GatewayRuntimeConfigService } from '../gateway-runtime-config.service';

jest.mock('../../../../app/config/app.config', () => ({ AppConfig: { get: jest.fn() } }));

describe('GatewayRuntimeConfigService', () => {
  const key = 'ab'.repeat(32);
  const repository = { findByGateway: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(AppConfig.get).mockReturnValue({
      PAYMENT_TOKEN_ENCRYPTION_KEY: key,
    } as ReturnType<typeof AppConfig.get>);
  });

  it('decrypts a complete PayPal configuration for a new checkout', async () => {
    repository.findByGateway.mockResolvedValue(
      record(BillingGateway.PAYPAL, true, {
        [GatewayCredentialField.CLIENT_ID]: encrypted(
          BillingGateway.PAYPAL,
          GatewayCredentialField.CLIENT_ID,
          'client-id',
        ),
        [GatewayCredentialField.CLIENT_SECRET]: encrypted(
          BillingGateway.PAYPAL,
          GatewayCredentialField.CLIENT_SECRET,
          'client-secret',
        ),
        [GatewayCredentialField.WEBHOOK_ID]: encrypted(
          BillingGateway.PAYPAL,
          GatewayCredentialField.WEBHOOK_ID,
          'webhook-id',
        ),
      }),
    );
    const service = new GatewayRuntimeConfigService(repository as never);

    await expect(service.getPaypalCheckout()).resolves.toMatchObject({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      webhookId: 'webhook-id',
    });
  });

  it('rejects a disabled gateway for new checkout but permits settlement access', async () => {
    repository.findByGateway.mockResolvedValue(
      record(BillingGateway.PAYPAL, false, {
        [GatewayCredentialField.CLIENT_ID]: encrypted(
          BillingGateway.PAYPAL,
          GatewayCredentialField.CLIENT_ID,
          'client-id',
        ),
        [GatewayCredentialField.CLIENT_SECRET]: encrypted(
          BillingGateway.PAYPAL,
          GatewayCredentialField.CLIENT_SECRET,
          'client-secret',
        ),
        [GatewayCredentialField.WEBHOOK_ID]: encrypted(
          BillingGateway.PAYPAL,
          GatewayCredentialField.WEBHOOK_ID,
          'webhook-id',
        ),
      }),
    );
    const service = new GatewayRuntimeConfigService(repository as never);

    await expect(service.getPaypalCheckout()).rejects.toMatchObject({
      code: BillingErrorCode.PAYMENT_METHOD_UNAVAILABLE,
    });
    await expect(service.getPaypalOperations()).resolves.toMatchObject({ clientId: 'client-id' });
  });

  function encrypted(
    gateway: BillingGateway,
    field: GatewayCredentialField,
    value: string,
  ): string {
    return encryptGatewayToken(value, key, 1, {
      userId: 'gateway-config',
      gateway,
      paymentMethodId: field,
    });
  }

  function record(
    gateway: BillingGateway,
    isEnabled: boolean,
    encryptedCredentials: Record<string, string>,
  ): object {
    return {
      id: 'config-1',
      gateway,
      isEnabled,
      mode: GatewayMode.LIVE,
      encryptedCredentials,
      options: {},
      encryptionKeyVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
});
