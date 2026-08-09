import { describe, expect, it } from 'vitest';

import { ROUTE_PERMISSIONS } from '@/constants/route-permissions.constants';
import { ROUTES } from '@/constants/routes.constants';

describe('ROUTE_PERMISSIONS', () => {
  it('declares each route prefix only once', () => {
    const paymentGatewayEntries = ROUTE_PERMISSIONS.filter(
      ({ prefix }) => prefix === ROUTES.ADMIN_PAYMENT_GATEWAYS,
    );

    expect(paymentGatewayEntries).toHaveLength(1);
  });
});
