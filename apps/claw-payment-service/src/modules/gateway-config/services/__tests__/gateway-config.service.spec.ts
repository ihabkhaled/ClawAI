import { BillingGateway } from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import { encryptGatewayToken } from '../../../../common/utilities/token-vault.utility';
import { GatewayMode } from '../../enums/gateway-mode.enum';
import { GatewayConfigService } from '../gateway-config.service';

const KEY = '11'.repeat(32);
const encrypt = (gateway: BillingGateway, field: string, value: string): string =>
  encryptGatewayToken(value, KEY, 1, {
    userId: 'gateway-config',
    gateway,
    paymentMethodId: field,
  });

describe('GatewayConfigService', () => {
  const repository = {
    findAll: jest.fn(),
    findEnabled: jest.fn(),
    findByGateway: jest.fn(),
    upsert: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppConfig, 'get').mockReturnValue({
      PAYMENT_TOKEN_ENCRYPTION_KEY: KEY,
      PAYMENT_TOKEN_KEY_VERSION: 1,
    } as ReturnType<typeof AppConfig.get>);
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns configured metadata without exposing stored credentials', async () => {
    const encryptedSecret = encrypt(BillingGateway.PAYPAL, 'clientSecret', 'never-return-this');
    repository.findAll.mockResolvedValue([
      {
        id: 'gateway-1',
        gateway: BillingGateway.PAYPAL,
        isEnabled: true,
        mode: GatewayMode.SANDBOX,
        encryptedCredentials: {
          clientId: encrypt(BillingGateway.PAYPAL, 'clientId', 'public-id'),
          clientSecret: encryptedSecret,
        },
        options: {},
        encryptionKeyVersion: 1,
        createdAt: new Date('2026-08-09T00:00:00.000Z'),
        updatedAt: new Date('2026-08-09T00:00:00.000Z'),
      },
    ]);

    const result = await new GatewayConfigService(repository as never).listAdmin();
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('never-return-this');
    expect(serialized).not.toContain(encryptedSecret);
    expect(result[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'clientId', configured: true }),
        expect.objectContaining({ key: 'webhookId', configured: false }),
      ]),
    );
  });

  it('preserves blank credentials and encrypts explicitly supplied values', async () => {
    const existingSecret = encrypt(BillingGateway.PAYPAL, 'clientSecret', 'existing-secret');
    repository.findByGateway.mockResolvedValue({
      id: 'gateway-1',
      gateway: BillingGateway.PAYPAL,
      isEnabled: false,
      mode: GatewayMode.SANDBOX,
      encryptedCredentials: { clientSecret: existingSecret },
      options: {},
      encryptionKeyVersion: 1,
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
      updatedAt: new Date('2026-08-09T00:00:00.000Z'),
    });
    repository.upsert.mockImplementation(async (_gateway: BillingGateway, data: unknown) => ({
      id: 'gateway-1',
      gateway: BillingGateway.PAYPAL,
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
      updatedAt: new Date('2026-08-09T00:00:00.000Z'),
      ...(data as object),
    }));

    await new GatewayConfigService(repository as never).update(BillingGateway.PAYPAL, {
      isEnabled: true,
      credentials: { clientId: 'new-public-id', clientSecret: '' },
    });

    const data = repository.upsert.mock.calls[0]?.[1];
    expect(data.encryptedCredentials.clientSecret).toBe(existingSecret);
    expect(data.encryptedCredentials.clientId).not.toBe('new-public-id');
  });

  it('returns only enabled gateway checkout metadata with safe public identifiers', async () => {
    repository.findEnabled.mockResolvedValue([
      {
        id: 'gateway-1',
        gateway: BillingGateway.PAYPAL,
        isEnabled: true,
        mode: GatewayMode.SANDBOX,
        encryptedCredentials: {
          clientId: encrypt(BillingGateway.PAYPAL, 'clientId', 'public-client-id'),
          clientSecret: encrypt(BillingGateway.PAYPAL, 'clientSecret', 'secret'),
        },
        options: {},
        encryptionKeyVersion: 1,
        createdAt: new Date('2026-08-09T00:00:00.000Z'),
        updatedAt: new Date('2026-08-09T00:00:00.000Z'),
      },
    ]);

    const result = await new GatewayConfigService(repository as never).listCheckout();

    expect(result).toEqual([
      {
        gateway: BillingGateway.PAYPAL,
        mode: GatewayMode.SANDBOX,
        testingSoon: false,
        publicIdentifier: 'public-client-id',
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});
