import { BillingGateway } from '@claw/shared-types';

import { gatewayParamSchema, updateGatewayConfigurationSchema } from '../gateway-config.dto';

describe('gateway configuration DTOs', () => {
  it('accepts the two supported gateway route values', () => {
    expect(gatewayParamSchema.parse({ gateway: BillingGateway.PAYPAL })).toEqual({
      gateway: BillingGateway.PAYPAL,
    });
    expect(gatewayParamSchema.parse({ gateway: BillingGateway.PAYMOB })).toEqual({
      gateway: BillingGateway.PAYMOB,
    });
    expect(gatewayParamSchema.safeParse({ gateway: 'STRIPE' }).success).toBe(false);
  });

  it('accepts one shared shape while preserving blank credentials', () => {
    const result = updateGatewayConfigurationSchema.parse({
      isEnabled: true,
      mode: 'SANDBOX',
      credentials: {
        clientId: 'client-id',
        clientSecret: '',
      },
      options: { currency: 'USD' },
    });

    expect(result.credentials?.clientSecret).toBe('');
  });

  it('rejects unknown and unbounded credential fields', () => {
    expect(
      updateGatewayConfigurationSchema.safeParse({ credentials: { password: 'secret' } }).success,
    ).toBe(false);
    expect(
      updateGatewayConfigurationSchema.safeParse({
        credentials: { clientSecret: 'x'.repeat(4097) },
      }).success,
    ).toBe(false);
  });
});
