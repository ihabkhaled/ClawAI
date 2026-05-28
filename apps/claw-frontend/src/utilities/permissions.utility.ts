import type { Permission } from '@/enums';
import { UserRole } from '@/enums';
import type { UserProfile } from '@/types';

// Frontend permission checks for UI gating ONLY — the backend remains the
// authoritative enforcer. ADMIN implicitly holds every permission.
export function isAdmin(user: UserProfile | null): boolean {
  return user?.role === UserRole.ADMIN;
}

export function hasPermission(user: UserProfile | null, permission: Permission): boolean {
  if (!user) {
    return false;
  }
  if (user.role === UserRole.ADMIN) {
    return true;
  }
  return user.permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(user: UserProfile | null, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}
