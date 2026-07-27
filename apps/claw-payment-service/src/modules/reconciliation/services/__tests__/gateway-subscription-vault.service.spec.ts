import { encryptGatewayToken } from '../../../../common/utilities/token-vault.utility';
import { GatewaySubscriptionVaultService } from '../gateway-subscription-vault.service';
import { subscriptionFixture } from './reconciliation.fixture';

const KEY = '11'.repeat(32);

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: () => ({ PAYMENT_TOKEN_ENCRYPTION_KEY: '11'.repeat(32) }),
  },
}));

describe('GatewaySubscriptionVaultService', () => {
  const service = new GatewaySubscriptionVaultService();

  it('decrypts a provider id only in the owning subscription row context', () => {
    const encrypted = encryptGatewayToken('provider-subscription-1', KEY, 1, {
      userId: 'user-1',
      gateway: 'PAYPAL',
      paymentMethodId: 'subscription-1',
    });

    expect(
      service.decrypt(subscriptionFixture({ encryptedGatewaySubscriptionId: encrypted })),
    ).toBe('provider-subscription-1');
  });

  it('rejects a ciphertext moved to a different subscription', () => {
    const encrypted = encryptGatewayToken('provider-subscription-1', KEY, 1, {
      userId: 'user-1',
      gateway: 'PAYPAL',
      paymentMethodId: 'subscription-1',
    });

    expect(() =>
      service.decrypt(
        subscriptionFixture({
          id: 'subscription-2',
          encryptedGatewaySubscriptionId: encrypted,
        }),
      ),
    ).toThrow();
  });
});
