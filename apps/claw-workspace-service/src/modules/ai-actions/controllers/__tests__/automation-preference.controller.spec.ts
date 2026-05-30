import { Permission } from '@claw/shared-types';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';

import { AutomationPreferenceController } from '../automation-preference.controller';

// Pure metadata test: protects the RBAC posture of the AutomationPreferenceController.
// Automation preferences are per-USER settings — every read AND every write is open
// to any authenticated user (the service layer scopes by @CurrentUser). A regression
// that re-adds @RequirePermissions(ADMIN_WORKSPACE_AUTOMATION_MANAGE) on the upsert
// would lock normal USERs out of tuning their OWN thresholds.
function getRequiredPermissions(handler: object): Permission[] {
  return (
    (Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, handler) as Permission[] | undefined) ?? []
  );
}

describe('AutomationPreferenceController RBAC decorators', () => {
  const prototype = AutomationPreferenceController.prototype;

  describe('reads stay open to any authenticated user', () => {
    it('GET / has no @RequirePermissions decorator', () => {
      expect(getRequiredPermissions(prototype.list)).toEqual([]);
    });

    it('GET /learned has no @RequirePermissions decorator', () => {
      expect(getRequiredPermissions(prototype.getLearned)).toEqual([]);
    });
  });

  describe('mutation is per-user, NOT admin-gated', () => {
    it('PUT /:actionKind has no @RequirePermissions decorator so a normal USER can save their own thresholds', () => {
      expect(getRequiredPermissions(prototype.upsert)).toEqual([]);
    });
  });
});
