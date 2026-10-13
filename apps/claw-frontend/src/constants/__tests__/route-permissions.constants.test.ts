import { describe, expect, it } from 'vitest';

import { ROUTE_PERMISSIONS } from '@/constants/route-permissions.constants';
import { ROUTES } from '@/constants/routes.constants';
import { Permission } from '@/enums';
import { requiredPermissionForPath } from '@/utilities/route-permission.utility';

describe('ROUTE_PERMISSIONS', () => {
  it('declares each route prefix only once', () => {
    const paymentGatewayEntries = ROUTE_PERMISSIONS.filter(
      ({ prefix }) => prefix === ROUTES.ADMIN_PAYMENT_GATEWAYS,
    );

    expect(paymentGatewayEntries).toHaveLength(1);
  });

  it('gates the Observability usage pages on the permission their API checks', () => {
    for (const path of [
      ROUTES.OBSERVABILITY_USERS,
      ROUTES.OBSERVABILITY_PROVIDERS,
      ROUTES.OBSERVABILITY_PROVIDER_DETAIL('GEMINI'),
      ROUTES.OBSERVABILITY_MODELS,
      ROUTES.OBSERVABILITY_MODEL_DETAIL,
      ROUTES.OBSERVABILITY_PLANS,
      ROUTES.OBSERVABILITY_SURFACES,
      ROUTES.OBSERVABILITY_CONSUMPTION,
      ROUTES.OBSERVABILITY_TRACING,
    ]) {
      expect(requiredPermissionForPath(path)).toBe(Permission.ADMIN_USAGE_VIEW);
    }
  });

  it('keeps the hub and the failures page on the system view permission', () => {
    expect(requiredPermissionForPath(ROUTES.OBSERVABILITY)).toBe(Permission.ADMIN_SYSTEM_VIEW);
    expect(requiredPermissionForPath(ROUTES.OBSERVABILITY_FAILURES)).toBe(
      Permission.ADMIN_SYSTEM_VIEW,
    );
  });
});
