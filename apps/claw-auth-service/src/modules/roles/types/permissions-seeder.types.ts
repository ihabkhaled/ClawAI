import { type Permission } from '@claw/shared-types';

// One line per role reconciled. Emitted as a structured log warning whenever
// the seeder detects drift between the in-DB role_permissions rows and the
// canonical SYSTEM_ROLE_SEED list. `added` / `removed` are empty arrays when
// nothing changed for that role.
export type RolePermissionReconciliationResult = {
  roleSlug: string;
  added: Permission[];
  removed: Permission[];
  finalGrantCount: number;
};

// Aggregate returned by PermissionsSeederService.reconcile() so the standalone
// `npm run seed:permissions` script can log a one-shot summary and the unit
// tests can assert per-role outcomes without spying on the logger.
export type PermissionsReconciliationSummary = {
  results: RolePermissionReconciliationResult[];
  reconcileEnabled: boolean;
};
