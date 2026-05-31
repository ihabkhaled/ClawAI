// Standalone permissions-only sync. Backs the `npm run seed:permissions`
// script so operators can roll a permission change out without redeploying
// the whole auth-service container (which would also trigger admin-tunable
// plan upserts and other side effects).
//
// Mirrors prisma/seed.js logic for the role-permissions reconciliation pass
// ONLY — does NOT touch users, plans, or backfill. Idempotent: safe to run
// repeatedly. Permission lists MUST stay in sync with
// src/common/constants/rbac.constants.ts (the typed source of truth).
//
// Runs under plain `node` (not ts-node) because the prod image doesn't ship
// the src/ tree, and dev images may not always have ts-node loaded.

const { PrismaPg } = require('@prisma/adapter-pg');
const path = require('path');

const distPrismaPath = path.resolve(__dirname, '..', 'dist', 'generated', 'prisma');
const { PrismaClient } = require(distPrismaPath);

const ALL_PERMISSIONS = [
  'CHAT_USE',
  'CHAT_READ_OWN',
  'CHAT_DELETE_OWN',
  'MEMORY_USE',
  'MEMORY_READ_OWN',
  'MEMORY_CREATE_OWN',
  'MEMORY_UPDATE_OWN',
  'MEMORY_DELETE_OWN',
  'CONTEXT_PACK_READ_OWN',
  'CONTEXT_PACK_CREATE_OWN',
  'CONTEXT_PACK_UPDATE_OWN',
  'CONTEXT_PACK_DELETE_OWN',
  'WORKSPACE_VIEW',
  'WORKSPACE_APP_CONFIG_VIEW',
  'WORKSPACE_CONNECT_OWN',
  'WORKSPACE_READ_OWN',
  'WORKSPACE_SYNC_OWN',
  'WORKSPACE_ACTION_OWN',
  'MODEL_USE_ALLOWED',
  'ROUTER_USE',
  'COMPARE_USE',
  'JUDGE_USE',
  'FILES_USE',
  'RESEARCH_USE',
  'AGENT_USE',
  'MODELS_CATALOG_VIEW',
  'VIEW_DASHBOARD',
  'ADMIN_USERS_MANAGE',
  'ADMIN_PLANS_MANAGE',
  'ADMIN_PERMISSIONS_MANAGE',
  'ADMIN_CONNECTORS_MANAGE',
  'ADMIN_ROUTING_MANAGE',
  'ADMIN_MODELS_MANAGE',
  'ADMIN_WORKSPACE_AUTOMATION_MANAGE',
  'ADMIN_SYSTEM_VIEW',
  'ADMIN_LOGS_VIEW',
  'ADMIN_WORKSPACES_VIEW',
  'ADMIN_USAGE_VIEW',
];

const USER_DEFAULT_PERMISSIONS = [
  'CHAT_USE',
  'CHAT_READ_OWN',
  'CHAT_DELETE_OWN',
  'WORKSPACE_VIEW',
  'WORKSPACE_APP_CONFIG_VIEW',
  'WORKSPACE_CONNECT_OWN',
  'WORKSPACE_READ_OWN',
  'WORKSPACE_SYNC_OWN',
  'WORKSPACE_ACTION_OWN',
  'MODEL_USE_ALLOWED',
  'AGENT_USE',
  'RESEARCH_USE',
  'COMPARE_USE',
  'FILES_USE',
];

const SYSTEM_ROLES = [
  { slug: 'ADMIN', permissions: ALL_PERMISSIONS },
  { slug: 'USER', permissions: USER_DEFAULT_PERMISSIONS },
];

const connectionString = process.env.AUTH_DATABASE_URL;
if (!connectionString) {
  throw new Error('AUTH_DATABASE_URL must be set when running seed-permissions');
}

const reconcileEnabled = (process.env.SEED_RECONCILE_PERMISSIONS ?? 'true').toLowerCase() !== 'false';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function reconcileRole(def) {
  const role = await prisma.role.findUnique({ where: { slug: def.slug } });
  if (!role) {
    console.warn(`seed-permissions: system role slug=${def.slug} not found, skipping`);
    return { slug: def.slug, added: 0, removed: 0 };
  }

  const existing = await prisma.rolePermission.findMany({ where: { roleId: role.id } });
  const wantedSet = new Set(def.permissions);
  const existingSet = new Set(existing.map((g) => g.permission));
  const toAdd = def.permissions.filter((p) => !existingSet.has(p));
  const toRemove = reconcileEnabled
    ? existing.filter((g) => !wantedSet.has(g.permission)).map((g) => g.permission)
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
  if (toAdd.length > 0 || toRemove.length > 0) {
    console.warn(
      `seed-permissions: roleSlug=${def.slug} added=[${toAdd.join(',')}] removed=[${toRemove.join(',')}]`,
    );
  } else {
    console.warn(`seed-permissions: roleSlug=${def.slug} no drift`);
  }
  return { slug: def.slug, added: toAdd.length, removed: toRemove.length };
}

async function run() {
  console.warn(`seed-permissions: reconcileEnabled=${reconcileEnabled}`);
  for (const def of SYSTEM_ROLES) {
    await reconcileRole(def);
  }
  console.warn('seed-permissions: done');
}

run()
  .catch((error) => {
    console.error('seed-permissions failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
