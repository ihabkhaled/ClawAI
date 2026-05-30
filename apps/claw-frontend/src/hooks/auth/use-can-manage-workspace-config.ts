import { Permission } from '@/enums';
import { usePermissions } from '@/hooks/auth/use-permissions';

// Centralised UI gate for "can this caller mutate workspace-level configs?".
// Mirrors the canManage check that already exists in
// use-workspace-app-configs-page so every workspace sub-page (email signatures,
// email templates, automation preferences, app configs) hides its
// admin-only buttons against the SAME rule. ADMIN bypasses every check via
// isAdmin; non-admins need ADMIN_WORKSPACE_AUTOMATION_MANAGE explicitly.
// Backend remains the authoritative enforcer.
export function useCanManageWorkspaceConfig(): boolean {
  const permissions = usePermissions();
  return permissions.isAdmin || permissions.can(Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE);
}
