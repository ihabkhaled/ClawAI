import { Permission } from '@claw/shared-types';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';

import { AutomationPreferenceController } from '../automation-preference.controller';

// Pure metadata test: protects the @RequirePermissions decorator on the
// upsert endpoint (PUT /:actionKind). The row is per-user but the policy
// treats automation preference writes as admin-config — a regression here
// would let a normal USER tune the AI automation thresholds.
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

  describe('mutation — admin only, MUST NOT regress', () => {
    it('PUT /:actionKind requires ADMIN_WORKSPACE_AUTOMATION_MANAGE', () => {
      expect(getRequiredPermissions(prototype.upsert)).toEqual([
        Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
      ]);
    });
  });
});
