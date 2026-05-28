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
  const existingGrants = await prisma.rolePermission.count({ where: { roleId: role.id } });
  if (existingGrants === 0) {
    await prisma.rolePermission.createMany({
      data: def.permissions.map((permission) => ({ roleId: role.id, permission })),
      skipDuplicates: true,
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

  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    console.warn('Users already exist — skipping admin creation.');
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
