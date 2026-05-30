import { Permission } from '@claw/shared-types';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';

import { WorkspaceConnectorController } from '../workspace-connector.controller';

// Pure metadata test: verifies that every endpoint on the workspace-connector
// controller carries the @RequirePermissions metadata the PermissionGuard
// uses to gate access. Wired-up integration is exercised by the
// PermissionGuard's own contract tests; this test only protects against
// accidental removal of decorators (a frequent class of RBAC regression).
function getRequiredPermissions(handler: object): Permission[] {
  return (
    (Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, handler) as Permission[] | undefined) ?? []
  );
}

describe('WorkspaceConnectorController RBAC decorators', () => {
  const prototype = WorkspaceConnectorController.prototype;

  it('gates POST /connectors (create) by WORKSPACE_CONNECT_OWN', () => {
    expect(getRequiredPermissions(prototype.create)).toEqual([Permission.WORKSPACE_CONNECT_OWN]);
  });

  it('gates GET /connectors (list) by WORKSPACE_VIEW', () => {
    expect(getRequiredPermissions(prototype.findAll)).toEqual([Permission.WORKSPACE_VIEW]);
  });

  it('gates GET /connectors/:id by WORKSPACE_VIEW', () => {
    expect(getRequiredPermissions(prototype.findOne)).toEqual([Permission.WORKSPACE_VIEW]);
  });

  it('gates PATCH /connectors/:id by WORKSPACE_CONNECT_OWN', () => {
    expect(getRequiredPermissions(prototype.update)).toEqual([Permission.WORKSPACE_CONNECT_OWN]);
  });

  it('gates DELETE /connectors/:id by WORKSPACE_CONNECT_OWN', () => {
    expect(getRequiredPermissions(prototype.remove)).toEqual([Permission.WORKSPACE_CONNECT_OWN]);
  });

  it('gates POST /connectors/:id/health by WORKSPACE_VIEW', () => {
    expect(getRequiredPermissions(prototype.testHealth)).toEqual([Permission.WORKSPACE_VIEW]);
  });

  it('gates POST /connectors/:id/sync by WORKSPACE_SYNC_OWN', () => {
    expect(getRequiredPermissions(prototype.triggerSync)).toEqual([Permission.WORKSPACE_SYNC_OWN]);
  });

  it('gates PATCH /connectors/:id/cadence by WORKSPACE_SYNC_OWN', () => {
    expect(getRequiredPermissions(prototype.updateCadence)).toEqual([
      Permission.WORKSPACE_SYNC_OWN,
    ]);
  });

  it('gates POST /connectors/:id/pause by WORKSPACE_SYNC_OWN', () => {
    expect(getRequiredPermissions(prototype.pause)).toEqual([Permission.WORKSPACE_SYNC_OWN]);
  });

  it('gates POST /connectors/:id/resume by WORKSPACE_SYNC_OWN', () => {
    expect(getRequiredPermissions(prototype.resume)).toEqual([Permission.WORKSPACE_SYNC_OWN]);
  });

  it('gates GET /connectors/:id/sync-runs by WORKSPACE_VIEW', () => {
    expect(getRequiredPermissions(prototype.listSyncRuns)).toEqual([Permission.WORKSPACE_VIEW]);
  });

  it('gates GET /connectors/:id/health-events by WORKSPACE_VIEW', () => {
    expect(getRequiredPermissions(prototype.listHealthEvents)).toEqual([Permission.WORKSPACE_VIEW]);
  });

  it('never requires an admin-only permission on any connector endpoint', () => {
    const adminPermissions = new Set<string>([
      Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE,
      Permission.ADMIN_WORKSPACES_VIEW,
      Permission.ADMIN_SYSTEM_VIEW,
      Permission.ADMIN_USERS_MANAGE,
    ]);
    const handlers: Array<keyof WorkspaceConnectorController> = [
      'create',
      'findAll',
      'findOne',
      'update',
      'remove',
      'testHealth',
      'triggerSync',
      'updateCadence',
      'pause',
      'resume',
      'listSyncRuns',
      'listHealthEvents',
    ];
    for (const name of handlers) {
      const perms = getRequiredPermissions(prototype[name] as object);
      for (const p of perms) {
        expect(adminPermissions.has(p)).toBe(false);
      }
    }
  });
});
