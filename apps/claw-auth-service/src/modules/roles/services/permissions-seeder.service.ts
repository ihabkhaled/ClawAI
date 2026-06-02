import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { type Permission } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { SYSTEM_ROLE_SEED } from '../../../common/constants/rbac.constants';
import {
  type PermissionsReconciliationSummary,
  type RolePermissionReconciliationResult,
} from '../types/permissions-seeder.types';

// Boot-time reconciler for the two system roles (ADMIN, USER). Runs once on
// service startup AND can be invoked standalone via `npm run seed:permissions`
// so operators can roll a permission change out without a full redeploy.
//
// Why this exists: prisma/seed.{js,ts} only executes during the initial
// container boot (entrypoint runs `prisma db seed` when the DB is fresh, or
// SEED_ON_START=true in prod). Permissions added to USER_DEFAULT_PERMISSIONS
// AFTER that first run never reach existing role_permissions rows, so the
// UI silently denies new features for upgraded installs.
//
// This service closes that gap: every boot it diffs the canonical
// SYSTEM_ROLE_SEED against role_permissions and inserts the missing grants.
// Removing extras that aren't in the seed is gated behind
// SEED_RECONCILE_PERMISSIONS (default 'false' = add-only), so permissions an
// admin granted via the UI — e.g. JUDGE_USE on the USER role — survive every
// `docker up`. Set the flag to 'true' to hard-reconcile back to the seed.
// Custom (non-system) roles are NEVER touched either way.
@Injectable()
export class PermissionsSeederService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsSeederService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    this.logger.debug('onModuleInit: starting role-permissions reconciliation');
    try {
      const summary = await this.reconcile();
      this.logger.log(
        `onModuleInit: reconciled ${summary.results.length} system role(s) (reconcileEnabled=${summary.reconcileEnabled})`,
      );
    } catch (error) {
      // Startup must not crash if the DB is briefly unreachable — the entry-
      // point already retries `prisma migrate deploy` 10 times before this
      // module ever boots, but we still soft-fail so a transient blip doesn't
      // take the whole auth service down.
      this.logger.error(
        `onModuleInit: reconciliation failed — ${(error as Error).message}`,
      );
    }
  }

  // Public entry point for both the OnModuleInit hook AND the standalone
  // `npm run seed:permissions` script. Returns a structured summary that lets
  // callers (and tests) inspect what changed without scraping log output.
  async reconcile(): Promise<PermissionsReconciliationSummary> {
    const reconcileEnabled = this.isReconcileEnabled();
    this.logger.debug(`reconcile: reconcileEnabled=${reconcileEnabled}`);
    const results: RolePermissionReconciliationResult[] = [];
    for (const def of SYSTEM_ROLE_SEED) {
      const result = await this.reconcileRole(def.slug, def.permissions, reconcileEnabled);
      results.push(result);
    }
    return { results, reconcileEnabled };
  }

  // Reconciles a single role. Returns the per-role diff so the caller can log
  // an aggregate summary AND so the unit tests can assert exact behaviour.
  private async reconcileRole(
    slug: string,
    wantedPermissions: readonly Permission[],
    reconcileEnabled: boolean,
  ): Promise<RolePermissionReconciliationResult> {
    const role = await this.prisma.role.findUnique({ where: { slug } });
    if (!role) {
      // System roles are created by prisma/seed.{js,ts} on first boot. If the
      // role row is missing, the seeder hasn't run yet (fresh DB) or the
      // operator deleted it manually — either way, drift correction is not
      // the right place to recreate it. Log and move on.
      this.logger.warn(`reconcileRole: system role slug=${slug} not found, skipping`);
      return { roleSlug: slug, added: [], removed: [], finalGrantCount: 0 };
    }

    const existing = await this.prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permission: true },
    });
    const wantedSet = new Set<string>(wantedPermissions);
    const existingSet = new Set(existing.map((g) => g.permission));

    const toAdd: Permission[] = wantedPermissions.filter((p) => !existingSet.has(p));
    const toRemove: Permission[] = reconcileEnabled
      ? existing
          .map((g) => g.permission as Permission)
          .filter((p): p is Permission => !wantedSet.has(p))
      : [];

    if (toAdd.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: toAdd.map((permission) => ({ roleId: role.id, permission })),
        skipDuplicates: true,
      });
    }
    if (toRemove.length > 0) {
      await this.prisma.rolePermission.deleteMany({
        where: { roleId: role.id, permission: { in: toRemove } },
      });
    }

    const finalGrantCount = existingSet.size + toAdd.length - toRemove.length;
    if (toAdd.length > 0 || toRemove.length > 0) {
      // Structured warning so observability picks it up and ops can audit the
      // exact permission delta a deploy applied. Never logs token-shaped data.
      this.logger.warn(
        `reconcileRole: drift detected — roleSlug=${slug} added=[${toAdd.join(',')}] removed=[${toRemove.join(',')}] finalGrantCount=${finalGrantCount}`,
      );
    } else {
      this.logger.debug(
        `reconcileRole: no drift — roleSlug=${slug} grantCount=${finalGrantCount}`,
      );
    }

    return { roleSlug: slug, added: toAdd, removed: toRemove, finalGrantCount };
  }

  // Reads SEED_RECONCILE_PERMISSIONS via AppConfig (Zod-validated) so the
  // value is coerced once at boot. AppConfig.get() returns a cached object
  // so this is cheap to call inside reconcile().
  private isReconcileEnabled(): boolean {
    return AppConfig.get().SEED_RECONCILE_PERMISSIONS;
  }
}
