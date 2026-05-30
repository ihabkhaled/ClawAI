import { Permission } from '@claw/shared-types';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';

import { EmailTemplateController } from '../email-template.controller';

// Pure metadata test: protects the @RequirePermissions decorators on the
// mutation endpoints (POST/PATCH/DELETE) from accidental loosening — a
// regression that would let a normal USER create, edit, or delete email
// templates (admin-config-write per the per-page RBAC policy).
function getRequiredPermissions(handler: object): Permission[] {
  return (
    (Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, handler) as Permission[] | undefined) ?? []
  );
}

describe('EmailTemplateController RBAC decorators', () => {
  const prototype = EmailTemplateController.prototype;

  describe('reads stay open to any authenticated user', () => {
    it('GET / has no @RequirePermissions decorator', () => {
      expect(getRequiredPermissions(prototype.list)).toEqual([]);
    });

    it('GET /default has no @RequirePermissions decorator', () => {
      expect(getRequiredPermissions(prototype.getDefault)).toEqual([]);
    });

    it('GET /:id has no @RequirePermissions decorator', () => {
      expect(getRequiredPermissions(prototype.getOne)).toEqual([]);
    });
  });

  describe('mutations — admin only, MUST NOT regress', () => {
    it('POST / requires ADMIN_WORKSPACE_AUTOMATION_MANAGE', () => {
      expect(getRequiredPermissions(prototype.create)).toEqual([
        Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
      ]);
    });

    it('PATCH /:id requires ADMIN_WORKSPACE_AUTOMATION_MANAGE', () => {
      expect(getRequiredPermissions(prototype.update)).toEqual([
        Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
      ]);
    });

    it('DELETE /:id requires ADMIN_WORKSPACE_AUTOMATION_MANAGE', () => {
      expect(getRequiredPermissions(prototype.remove)).toEqual([
        Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
      ]);
    });
  });
});
