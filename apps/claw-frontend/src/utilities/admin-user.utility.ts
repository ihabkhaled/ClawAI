import type { BadgeProps } from '@/components/ui/badge';
import { UserRole } from '@/enums';
import type { AdminUser } from '@/types';

// Map an AdminUser to a single-character avatar fallback. Prefers the first
// letter of the username, falls back to the first letter of the email if
// the username is empty. Always returns an uppercase character — the
// AvatarFallback renders it inside a primary-tinted circle so a meaningful
// initial reads better than a generic person icon at small sizes.
export function resolveUserInitial(user: AdminUser): string {
  const source = user.username.length > 0 ? user.username : user.email;
  const firstChar = source.charAt(0);
  return firstChar.length > 0 ? firstChar.toUpperCase() : '?';
}

// Map a UserRole string to a Badge variant. ADMIN → default (filled primary)
// is the visually loudest; OPERATOR → secondary; everyone else → outline.
// Falls back to outline for unknown future roles so we never crash on a
// new role string coming from the API.
export function resolveRoleBadgeVariant(role: string): BadgeProps['variant'] {
  if (role === UserRole.ADMIN) {
    return 'default';
  }
  if (role === UserRole.OPERATOR) {
    return 'secondary';
  }
  return 'outline';
}
