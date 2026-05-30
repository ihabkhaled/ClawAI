import { Permission } from '@claw/shared-types';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';

import { WorkspaceOAuthController } from '../workspace-oauth.controller';

function getRequiredPermissions(handler: object): Permission[] {
  return (
    (Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, handler) as Permission[] | undefined) ?? []
  );
}

describe('WorkspaceOAuthController RBAC decorators', () => {
  const prototype = WorkspaceOAuthController.prototype;

  it('POST /workspace/oauth/init is open to USER under WORKSPACE_CONNECT_OWN', () => {
    expect(getRequiredPermissions(prototype.initOAuth)).toEqual([Permission.WORKSPACE_CONNECT_OWN]);
  });

  it('GET /workspace/oauth/callback is open to USER under WORKSPACE_CONNECT_OWN', () => {
    expect(getRequiredPermissions(prototype.handleCallback)).toEqual([
      Permission.WORKSPACE_CONNECT_OWN,
    ]);
  });

  it('POST /workspace/oauth/test-connection requires WORKSPACE_APP_CONFIG_VIEW', () => {
    expect(getRequiredPermissions(prototype.testAppConfigConnection)).toEqual([
      Permission.WORKSPACE_APP_CONFIG_VIEW,
    ]);
  });

  it('POST /workspace/oauth/test-pat requires WORKSPACE_CONNECT_OWN', () => {
    expect(getRequiredPermissions(prototype.testPatToken)).toEqual([
      Permission.WORKSPACE_CONNECT_OWN,
    ]);
  });
});
