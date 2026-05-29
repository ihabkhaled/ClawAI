import 'reflect-metadata';
import { RoutingController } from '../routing.controller';
import { ROLES_KEY } from '../../../../app/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums';

// Routing policy management + decision/replay diagnostics expose RoutingDecision
// rows, which carry a user's messageContent but no userId. Without a role guard
// any authenticated user could read another user's prompt via
// GET /routing/decisions/detail/:id (an IDOR) and mutate global routing policy.
// The class-level @Roles guard restricts the whole controller to ADMIN/OPERATOR.
describe('RoutingController authorization', () => {
  it('is restricted at the class level to exactly ADMIN and OPERATOR', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, RoutingController) as UserRole[] | undefined;
    expect(roles).toBeDefined();
    // Exact match proves no other role (the registered USER role, VIEWER, etc.)
    // can reach these endpoints — the RolesGuard denies any role not listed.
    expect(roles).toEqual([UserRole.ADMIN, UserRole.OPERATOR]);
  });

  it('does not grant access to the read-only VIEWER role', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, RoutingController) as UserRole[] | undefined;
    expect(roles).not.toContain(UserRole.VIEWER);
  });
});
