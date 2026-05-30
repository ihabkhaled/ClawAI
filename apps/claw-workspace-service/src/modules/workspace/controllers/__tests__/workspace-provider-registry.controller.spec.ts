import { ROLES_KEY } from '@claw/shared-auth';
import { Permission, UserRole } from '@claw/shared-types';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';

import { WorkspaceProviderRegistryController } from '../workspace-provider-registry.controller';

// Pure metadata test: protects the role/permission decorators on the provider
// registry controller from accidental tightening (would break USER access)
// or accidental loosening (would let a normal USER create/edit/delete the
// admin-only app-level OAuth credential rows). Uses raw Reflect.getMetadata
// since handler references are typed as `object` (the Reflector helper from
// Nest narrows to `Function`).
function getRequiredPermissions(handler: object): Permission[] {
  return (
    (Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, handler) as Permission[] | undefined) ?? []
  );
}

function getRoles(handler: object): UserRole[] {
  return (Reflect.getMetadata(ROLES_KEY, handler) as UserRole[] | undefined) ?? [];
}

describe('WorkspaceProviderRegistryController RBAC decorators', () => {
  const prototype = WorkspaceProviderRegistryController.prototype;

  describe('provider catalog (always open to USER)', () => {
    it('GET /providers stays open to every role incl. USER', () => {
      expect(getRoles(prototype.listProviders)).toEqual(
        expect.arrayContaining([UserRole.USER, UserRole.ADMIN]),
      );
      expect(getRequiredPermissions(prototype.listProviders)).toEqual([]);
    });

    it('GET /providers/:provider stays open to every role incl. USER', () => {
      expect(getRoles(prototype.getProvider)).toEqual(
        expect.arrayContaining([UserRole.USER, UserRole.ADMIN]),
      );
      expect(getRequiredPermissions(prototype.getProvider)).toEqual([]);
    });
  });

  describe('provider-app-configs READS — open to USER under WORKSPACE_APP_CONFIG_VIEW', () => {
    it('GET /provider-app-configs is gated by WORKSPACE_APP_CONFIG_VIEW (NOT admin)', () => {
      expect(getRoles(prototype.listAppConfigs)).toEqual(
        expect.arrayContaining([UserRole.USER, UserRole.ADMIN]),
      );
      expect(getRequiredPermissions(prototype.listAppConfigs)).toEqual([
        Permission.WORKSPACE_APP_CONFIG_VIEW,
      ]);
    });

    it('GET /provider-app-configs/:id is gated by WORKSPACE_APP_CONFIG_VIEW (NOT admin)', () => {
      expect(getRoles(prototype.getAppConfig)).toEqual(
        expect.arrayContaining([UserRole.USER, UserRole.ADMIN]),
      );
      expect(getRequiredPermissions(prototype.getAppConfig)).toEqual([
        Permission.WORKSPACE_APP_CONFIG_VIEW,
      ]);
    });
  });

  describe('provider-app-configs WRITES — admin only, MUST NOT regress', () => {
    it('POST /provider-app-configs requires ADMIN role + ADMIN_WORKSPACE_AUTOMATION_MANAGE', () => {
      expect(getRoles(prototype.createAppConfig)).toEqual([UserRole.ADMIN]);
      expect(getRequiredPermissions(prototype.createAppConfig)).toEqual([
        Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
      ]);
    });

    it('PUT /provider-app-configs/:id requires ADMIN role + ADMIN_WORKSPACE_AUTOMATION_MANAGE', () => {
      expect(getRoles(prototype.updateAppConfig)).toEqual([UserRole.ADMIN]);
      expect(getRequiredPermissions(prototype.updateAppConfig)).toEqual([
        Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
      ]);
    });

    it('DELETE /provider-app-configs/:id requires ADMIN role + ADMIN_WORKSPACE_AUTOMATION_MANAGE', () => {
      expect(getRoles(prototype.deleteAppConfig)).toEqual([UserRole.ADMIN]);
      expect(getRequiredPermissions(prototype.deleteAppConfig)).toEqual([
        Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
      ]);
    });
  });
});
