import { Permission, UserRole } from '@claw/shared-types';

// Default permission grants used to SEED the system roles. After seeding, the
// grants live in the role_permissions table and are admin-editable — this
// constant is only the starting point, not the runtime source of truth.

// Every permission in the catalog (ADMIN baseline).
export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

// Own-scoped product usage for self-registered USERs. COMPARE_USE / JUDGE_USE
// are granted here but further gated by plan feature flags at resolve time.
export const USER_DEFAULT_PERMISSIONS: Permission[] = [
  Permission.CHAT_USE,
  Permission.CHAT_READ_OWN,
  Permission.CHAT_DELETE_OWN,
  Permission.MEMORY_USE,
  Permission.MEMORY_READ_OWN,
  Permission.MEMORY_CREATE_OWN,
  Permission.MEMORY_UPDATE_OWN,
  Permission.MEMORY_DELETE_OWN,
  Permission.CONTEXT_PACK_READ_OWN,
  Permission.CONTEXT_PACK_CREATE_OWN,
  Permission.CONTEXT_PACK_UPDATE_OWN,
  Permission.CONTEXT_PACK_DELETE_OWN,
  Permission.WORKSPACE_CONNECT_OWN,
  Permission.WORKSPACE_READ_OWN,
  Permission.WORKSPACE_SYNC_OWN,
  Permission.WORKSPACE_ACTION_OWN,
  Permission.MODEL_USE_ALLOWED,
  Permission.ROUTER_USE,
  Permission.COMPARE_USE,
  Permission.JUDGE_USE,
];

// Slugs of the two system roles. Slugs intentionally equal the UserRole enum
// values so the JWT `role` claim (enum) and the Role.slug stay interchangeable
// for the existing RolesGuard.
export const SYSTEM_ROLE_ADMIN_SLUG = UserRole.ADMIN;
export const SYSTEM_ROLE_USER_SLUG = UserRole.USER;

export const SYSTEM_ROLE_SEED: Array<{
  slug: string;
  name: string;
  description: string;
  permissions: Permission[];
}> = [
  {
    slug: SYSTEM_ROLE_ADMIN_SLUG,
    name: 'Administrator',
    description: 'Full platform access. Bypasses plan, quota and model gates.',
    permissions: ALL_PERMISSIONS,
  },
  {
    slug: SYSTEM_ROLE_USER_SLUG,
    name: 'User',
    description: 'Self-service product access scoped to the user’s own data.',
    permissions: USER_DEFAULT_PERMISSIONS,
  },
];
