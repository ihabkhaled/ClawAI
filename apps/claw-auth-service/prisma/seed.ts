import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma';
import { hashPassword } from '../src/common/utilities/hashing.utility';
import { SYSTEM_ROLE_SEED } from '../src/common/constants/rbac.constants';

// Prefer .env overrides; fall back to safe defaults for first-run dev installs.
const DEFAULT_ADMIN_EMAIL = process.env['ADMIN_EMAIL'] ?? 'admin@claw.local';
const DEFAULT_ADMIN_USERNAME = process.env['ADMIN_USERNAME'] ?? 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'] ?? 'ClawAdmin123!';

const connectionString = process.env['AUTH_DATABASE_URL'];
if (!connectionString) {
  throw new Error('AUTH_DATABASE_URL must be set when running prisma db seed');
}
// Add-only by default (SEED_RECONCILE_PERMISSIONS=false): first DB init still
// seeds the full SYSTEM_ROLE_SEED (the role row is created here and starts with
// zero grants, so every seed permission is ADDED), but later boots NEVER remove
// permissions an admin granted via the UI — that is what kept resetting Compare/
// Judge after `docker up`. Set the flag to 'true' to hard-reconcile (add AND
// remove) the two system roles back to the canonical seed.
const RECONCILE_ENABLED =
  (process.env['SEED_RECONCILE_PERMISSIONS'] ?? 'false').toLowerCase() === 'true';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function upsertSystemRole(def: (typeof SYSTEM_ROLE_SEED)[number]): Promise<string> {
  const role = await prisma.role.upsert({
    where: { slug: def.slug },
    update: { name: def.name, description: def.description, isSystem: true },
    create: {
      slug: def.slug,
      name: def.name,
      description: def.description,
      isSystem: true,
      isAssignable: true,
    },
  });
  const wanted = new Set<string>(def.permissions);
  const existing = await prisma.rolePermission.findMany({ where: { roleId: role.id } });
  const existingSet = new Set(existing.map((g) => g.permission));
  const toAdd = def.permissions.filter((permission) => !existingSet.has(permission));
  // Only strip extras when explicitly asked to hard-reconcile. Add-only mode
  // leaves admin-granted permissions in place across restarts.
  const toRemove = RECONCILE_ENABLED
    ? existing.filter((g) => !wanted.has(g.permission)).map((g) => g.permission)
    : [];
  if (toAdd.length > 0) {
    await prisma.rolePermission.createMany({
      data: toAdd.map((permission) => ({ roleId: role.id, permission })),
      skipDuplicates: true,
    });
  }
  if (toRemove.length > 0) {
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permission: { in: toRemove } },
    });
  }
  return role.id;
}

async function seed(): Promise<void> {
  const roleIdBySlug = new Map<string, string>();
  for (const def of SYSTEM_ROLE_SEED) {
    roleIdBySlug.set(def.slug, await upsertSystemRole(def));
  }

  const adminRoleId = roleIdBySlug.get('ADMIN');
  const userRoleId = roleIdBySlug.get('USER');
  if (!adminRoleId || !userRoleId) {
    throw new Error('System roles failed to seed');
  }

  await prisma.user.updateMany({
    where: { roleId: null, role: 'ADMIN' },
    data: { roleId: adminRoleId },
  });
  await prisma.user.updateMany({
    where: { roleId: null, role: { not: 'ADMIN' } },
    data: { roleId: userRoleId },
  });

  const existingAdmin = await prisma.user.findUnique({ where: { email: DEFAULT_ADMIN_EMAIL } });
  const existingSuperAdmin = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  if (existingSuperAdmin && existingSuperAdmin.id !== existingAdmin?.id) {
    console.warn(`Immutable super admin already exists: ${existingSuperAdmin.email}`);
    return;
  }
  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        role: 'ADMIN',
        roleId: adminRoleId,
        status: 'ACTIVE',
        isSuperAdmin: true,
        emailVerifiedAt: existingAdmin.emailVerifiedAt ?? new Date(),
      },
    });
    console.warn(`Reconciled immutable super admin: ${DEFAULT_ADMIN_EMAIL}`);
    return;
  }

  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  const admin = await prisma.user.create({
    data: {
      email: DEFAULT_ADMIN_EMAIL,
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash,
      role: 'ADMIN',
      roleId: adminRoleId,
      status: 'ACTIVE',
      isSuperAdmin: true,
      emailVerifiedAt: new Date(),
      mustChangePassword: true,
    },
  });

  console.warn(`Seeded default admin user: ${admin.email} (id: ${admin.id})`);
  console.warn('IMPORTANT: Change the admin password on first login.');
}

seed()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
