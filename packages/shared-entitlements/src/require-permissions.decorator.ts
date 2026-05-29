import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@claw/shared-types';
import { REQUIRE_PERMISSIONS_KEY } from './entitlements.tokens';

// Marks an endpoint (or whole controller) as requiring ALL of the listed
// permissions. Enforced by PermissionGuard, which resolves the caller's
// effective permissions from the auth-service entitlements endpoint (the
// admin-editable role→permission matrix). Undecorated routes are unaffected.
export const RequirePermissions = (...permissions: Permission[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
