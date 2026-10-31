import { useGlobalSessionGuard } from '@/hooks/admin/use-global-session-guard';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useTranslation } from '@/lib/i18n';
import type { UseSecuritySessionsPageReturn } from '@/types/admin-sessions.types';

/**
 * Controller of /admin/security/sessions. Only the super administrator may use it (ADR-204):
 * ending other administrators' sessions is an administrator mutation. The server enforces the
 * same rule; this only keeps the buttons from being shown to someone who would be refused.
 */
export function useSecuritySessionsPage(): UseSecuritySessionsPageReturn {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const guard = useGlobalSessionGuard();
  const isSuperAdmin = user?.isSuperAdmin === true;
  return { t, isSuperAdmin, isDenied: user !== null && user !== undefined && !isSuperAdmin, guard };
}
