import { Permission, UserRole } from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import { PermissionsSeederService } from '../permissions-seeder.service';
import { type PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { USER_DEFAULT_PERMISSIONS } from '../../../../common/constants/rbac.constants';

// Lightweight in-memory Prisma double. Only the four methods reconcile() uses
// are stubbed; everything else throws if hit, so tests catch accidental
// dependency growth.
type PrismaDouble = {
  role: { findUnique: jest.Mock };
  rolePermission: {
    findMany: jest.Mock;
    createMany: jest.Mock;
    deleteMany: jest.Mock;
  };
};

const makePrismaDouble = (): PrismaDouble => ({
  role: { findUnique: jest.fn() },
  rolePermission: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
});

// AppConfig.get() is called inside reconcile() — stub it per test so we can
// flip SEED_RECONCILE_PERMISSIONS without touching real env vars.
const stubAppConfig = (seedReconcile: boolean): void => {
  jest.spyOn(AppConfig, 'get').mockReturnValue({
    AUTH_DATABASE_URL: 'postgres://test',
    AUTH_PORT: 4001,
    REDIS_URL: 'redis://test',
    RABBITMQ_URL: 'amqp://test',
    JWT_SECRET: 'a'.repeat(32),
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    ENCRYPTION_KEY: '0'.repeat(64),
    INTER_SERVICE_AUTH_TOKEN: 's'.repeat(32),
    PAYMENT_SERVICE_URL: 'http://payment-service:4018',
    PUBLIC_SITE_URL: 'https://claw.local',
    CONTACT_EMAIL_ENABLED: 'false',
    CONTACT_EMAIL_PROVIDER: 'none',
    CONTACT_EMAIL_FROM: 'no-reply@claw.local',
    CONTACT_EMAIL_TO: '',
    CONTACT_SMTP_PORT: 587,
    CONTACT_SMTP_SECURE: 'false',
    DEPLOYMENT_STATUS_FILE: '/app/.deploy/status.json',
    SEED_RECONCILE_PERMISSIONS: seedReconcile,
  });
};

describe('PermissionsSeederService', () => {
  let prisma: PrismaDouble;
  let service: PermissionsSeederService;

  beforeEach(() => {
    prisma = makePrismaDouble();
    service = new PermissionsSeederService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('reconcile (drift detection + add path)', () => {
    it('adds missing permissions to a role that is behind the canonical seed', async () => {
      stubAppConfig(true);

      // ADMIN role has every permission already; USER role is behind by
      // COMPARE_USE + FILES_USE (the exact prod symptom this PR fixes).
      const adminRoleId = 'role-admin';
      const userRoleId = 'role-user';
      prisma.role.findUnique.mockImplementation(({ where }: { where: { slug: string } }) => {
        if (where.slug === UserRole.ADMIN) {
          return Promise.resolve({ id: adminRoleId, slug: UserRole.ADMIN });
        }
        if (where.slug === UserRole.USER) {
          return Promise.resolve({ id: userRoleId, slug: UserRole.USER });
        }
        return Promise.resolve(null);
      });
      prisma.rolePermission.findMany.mockImplementation(
        ({ where }: { where: { roleId: string } }) => {
          if (where.roleId === adminRoleId) {
            return Promise.resolve(Object.values(Permission).map((p) => ({ permission: p })));
          }
          // USER is behind the seed by COMPARE_USE + FILES_USE (the exact live
          // prod drift this PR fixes). Derive the "present" set from the
          // canonical constant minus those two so the fixture self-updates when
          // USER_DEFAULT_PERMISSIONS grows.
          return Promise.resolve(
            USER_DEFAULT_PERMISSIONS.filter(
              (p) => p !== Permission.COMPARE_USE && p !== Permission.FILES_USE,
            ).map((permission) => ({ permission })),
          );
        },
      );

      const summary = await service.reconcile();

      expect(summary.reconcileEnabled).toBe(true);
      const userResult = summary.results.find((r) => r.roleSlug === UserRole.USER);
      expect(userResult).toBeDefined();
      expect(userResult?.added).toEqual(
        expect.arrayContaining([Permission.COMPARE_USE, Permission.FILES_USE]),
      );
      expect(userResult?.added).toHaveLength(2);
      expect(userResult?.removed).toEqual([]);
      expect(userResult?.finalGrantCount).toBe(USER_DEFAULT_PERMISSIONS.length);

      // createMany must be called once for USER with exactly the 2 missing
      // permissions, never for ADMIN (which has no drift).
      expect(prisma.rolePermission.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          { roleId: userRoleId, permission: Permission.COMPARE_USE },
          { roleId: userRoleId, permission: Permission.FILES_USE },
        ]),
        skipDuplicates: true,
      });
      expect(prisma.rolePermission.deleteMany).not.toHaveBeenCalled();
    });

    it('removes extras when SEED_RECONCILE_PERMISSIONS=true', async () => {
      stubAppConfig(true);

      // ADMIN exists with the full set; USER has one EXTRA permission
      // (ADMIN_USERS_MANAGE) that is NOT in USER_DEFAULT_PERMISSIONS.
      prisma.role.findUnique.mockImplementation(({ where }: { where: { slug: string } }) => {
        if (where.slug === UserRole.ADMIN) {
          return Promise.resolve({ id: 'role-admin', slug: UserRole.ADMIN });
        }
        return Promise.resolve({ id: 'role-user', slug: UserRole.USER });
      });
      prisma.rolePermission.findMany.mockImplementation(
        ({ where }: { where: { roleId: string } }) => {
          if (where.roleId === 'role-admin') {
            return Promise.resolve(Object.values(Permission).map((p) => ({ permission: p })));
          }
          // Canonical USER set PLUS one EXTRA (ADMIN_USERS_MANAGE) that is not
          // in the seed. Deriving the base from the constant keeps this fixture
          // current when USER_DEFAULT_PERMISSIONS changes.
          return Promise.resolve([
            ...USER_DEFAULT_PERMISSIONS.map((permission) => ({ permission })),
            { permission: Permission.ADMIN_USERS_MANAGE },
          ]);
        },
      );

      const summary = await service.reconcile();

      const userResult = summary.results.find((r) => r.roleSlug === UserRole.USER);
      expect(userResult?.removed).toEqual([Permission.ADMIN_USERS_MANAGE]);
      expect(userResult?.added).toEqual([]);
      expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { roleId: 'role-user', permission: { in: [Permission.ADMIN_USERS_MANAGE] } },
      });
    });

    it('keeps extras when SEED_RECONCILE_PERMISSIONS=false (add-only mode)', async () => {
      stubAppConfig(false);

      prisma.role.findUnique.mockImplementation(({ where }: { where: { slug: string } }) => {
        if (where.slug === UserRole.ADMIN) {
          return Promise.resolve({ id: 'role-admin', slug: UserRole.ADMIN });
        }
        return Promise.resolve({ id: 'role-user', slug: UserRole.USER });
      });
      prisma.rolePermission.findMany.mockImplementation(
        ({ where }: { where: { roleId: string } }) => {
          if (where.roleId === 'role-admin') {
            return Promise.resolve(Object.values(Permission).map((p) => ({ permission: p })));
          }
          // USER has an extra ADMIN_LOGS_VIEW grant operators applied by hand.
          return Promise.resolve([
            { permission: Permission.CHAT_USE },
            { permission: Permission.ADMIN_LOGS_VIEW },
          ]);
        },
      );

      const summary = await service.reconcile();

      expect(summary.reconcileEnabled).toBe(false);
      const userResult = summary.results.find((r) => r.roleSlug === UserRole.USER);
      // Add-only: nothing removed even though ADMIN_LOGS_VIEW is an extra.
      expect(userResult?.removed).toEqual([]);
      // But still adds everything missing.
      expect(userResult?.added.length).toBeGreaterThan(0);
      expect(prisma.rolePermission.deleteMany).not.toHaveBeenCalled();
    });

    it('reports no drift when current grants already match the seed', async () => {
      stubAppConfig(true);

      prisma.role.findUnique.mockImplementation(({ where }: { where: { slug: string } }) => {
        if (where.slug === UserRole.ADMIN) {
          return Promise.resolve({ id: 'role-admin', slug: UserRole.ADMIN });
        }
        return Promise.resolve({ id: 'role-user', slug: UserRole.USER });
      });
      prisma.rolePermission.findMany.mockImplementation(
        ({ where }: { where: { roleId: string } }) => {
          if (where.roleId === 'role-admin') {
            return Promise.resolve(Object.values(Permission).map((p) => ({ permission: p })));
          }
          // Derive from the canonical constant so this "no drift" fixture
          // never goes stale when USER_DEFAULT_PERMISSIONS gains a permission.
          return Promise.resolve(USER_DEFAULT_PERMISSIONS.map((permission) => ({ permission })));
        },
      );

      const summary = await service.reconcile();

      for (const r of summary.results) {
        expect(r.added).toEqual([]);
        expect(r.removed).toEqual([]);
      }
      expect(prisma.rolePermission.createMany).not.toHaveBeenCalled();
      expect(prisma.rolePermission.deleteMany).not.toHaveBeenCalled();
    });

    it('skips reconciliation when a system role row is missing (fresh DB)', async () => {
      stubAppConfig(true);

      // Both system roles missing — emulates a brand-new DB where prisma db
      // seed hasn't created them yet.
      prisma.role.findUnique.mockResolvedValue(null);

      const summary = await service.reconcile();

      // Two results, both empty, both finalGrantCount=0.
      expect(summary.results).toHaveLength(2);
      for (const r of summary.results) {
        expect(r.added).toEqual([]);
        expect(r.removed).toEqual([]);
        expect(r.finalGrantCount).toBe(0);
      }
      expect(prisma.rolePermission.findMany).not.toHaveBeenCalled();
      expect(prisma.rolePermission.createMany).not.toHaveBeenCalled();
      expect(prisma.rolePermission.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('onModuleInit (startup soft-fail)', () => {
    it('runs reconcile() on module init', async () => {
      stubAppConfig(true);
      const spy = jest.spyOn(service, 'reconcile').mockResolvedValue({
        results: [],
        reconcileEnabled: true,
      });

      await service.onModuleInit();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('does NOT crash startup when reconcile() throws', async () => {
      stubAppConfig(true);
      jest.spyOn(service, 'reconcile').mockRejectedValue(new Error('db unavailable'));

      // The whole point: onModuleInit MUST resolve so the auth service still
      // boots even if the DB is briefly flaky during startup.
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });
});
