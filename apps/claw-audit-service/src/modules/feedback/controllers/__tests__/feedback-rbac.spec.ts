import 'reflect-metadata';

import { Permission } from '@claw/shared-types';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';

import { FeedbackAdminController } from '../feedback-admin.controller';
import { FeedbackController } from '../feedback.controller';

// Hiding the Admin nav entry is not the control. These assert the guard
// metadata that the server actually enforces, so a non-admin calling an admin
// route by hand is refused regardless of what the UI shows.

function permissionsOn(target: unknown): unknown {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target as object);
}

describe('feedback RBAC is declared on the server', () => {
  it('gates every user route behind FEEDBACK_SUBMIT', () => {
    expect(permissionsOn(FeedbackController)).toContain(Permission.FEEDBACK_SUBMIT);
  });

  it('gates every admin route behind ADMIN_FEEDBACK_MANAGE', () => {
    expect(permissionsOn(FeedbackAdminController)).toContain(Permission.ADMIN_FEEDBACK_MANAGE);
  });

  it('does not let the user permission reach the admin controller', () => {
    expect(permissionsOn(FeedbackAdminController)).not.toContain(Permission.FEEDBACK_SUBMIT);
  });

  it('does not let the admin permission be satisfied by the user controller', () => {
    expect(permissionsOn(FeedbackController)).not.toContain(Permission.ADMIN_FEEDBACK_MANAGE);
  });
});
