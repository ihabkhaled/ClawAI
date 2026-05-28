// Plain-JS seed so it runs in both dev (after `npm run build`) and prod
// without needing ts-node or the src/ tree. Imports the compiled Prisma
// client from dist/, where it lands in both modes after the build step.
//
// Idempotent: safe to run repeatedly. Seeds the two system roles + their
// permission grants, backfills roleId on existing users, and creates the
// default admin only when the users table is empty.
//
// Permission lists MUST stay in sync with
// src/common/constants/rbac.constants.ts (the typed source of truth). They are
// duplicated here as plain strings because this file runs under plain `node`
// in the prod image where the @claw/shared-types workspace isn't resolvable.

const { PrismaPg } = require('@prisma/adapter-pg');
const argon2 = require('argon2');
const path = require('path');

const distPrismaPath = path.resolve(__dirname, '..', 'dist', 'generated', 'prisma');
const { PrismaClient } = require(distPrismaPath);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@claw.local';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ClawAdmin123!';

const ARGON2_MEMORY_COST = 65536;
const ARGON2_TIME_COST = 3;
const ARGON2_PARALLELISM = 4;

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
  'WORKSPACE_CONNECT_OWN',
  'WORKSPACE_READ_OWN',
  'WORKSPACE_SYNC_OWN',
  'WORKSPACE_ACTION_OWN',
  'MODEL_USE_ALLOWED',
  'ROUTER_USE',
  'COMPARE_USE',
  'JUDGE_USE',
  'ADMIN_USERS_MANAGE',
  'ADMIN_PLANS_MANAGE',
  'ADMIN_PERMISSIONS_MANAGE',
  'ADMIN_CONNECTORS_MANAGE',
  'ADMIN_ROUTING_MANAGE',
  'ADMIN_MODELS_MANAGE',
  'ADMIN_SYSTEM_VIEW',
  'ADMIN_LOGS_VIEW',
  'ADMIN_WORKSPACES_VIEW',
  'ADMIN_USAGE_VIEW',
];

const USER_DEFAULT_PERMISSIONS = [
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
  'WORKSPACE_CONNECT_OWN',
  'WORKSPACE_READ_OWN',
  'WORKSPACE_SYNC_OWN',
  'WORKSPACE_ACTION_OWN',
  'MODEL_USE_ALLOWED',
  'ROUTER_USE',
  'COMPARE_USE',
  'JUDGE_USE',
];

const SYSTEM_ROLES = [
  {
    slug: 'ADMIN',
    name: 'Administrator',
    description: 'Full platform access. Bypasses plan, quota and model gates.',
    permissions: ALL_PERMISSIONS,
  },
  {
    slug: 'USER',
    name: 'User',
    description: 'Self-service product access scoped to the user’s own data.',
    permissions: USER_DEFAULT_PERMISSIONS,
  },
];

// Default plans (Phase B). A plan with ZERO PlanModelAccess rows means "no
// model restriction" — admins opt into restriction by adding rows, which keeps
// the v1 hot path working out of the box.
const SYSTEM_PLANS = [
  {
    slug: 'free',
    name: 'Free',
    description: 'Free tier with a daily token allowance.',
    displayOrder: 0,
    isDefault: true,
    dailyTokenQuota: 50000,
    allowCompareMode: false,
    allowJudgeMode: false,
    priceMonthly: 0,
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'Higher quota, compare and judge modes.',
    displayOrder: 1,
    isDefault: false,
    dailyTokenQuota: 500000,
    allowCompareMode: true,
    allowJudgeMode: true,
    priceMonthly: 20,
  },
  {
    slug: 'team',
    name: 'Team',
    description: 'Large quota and all features.',
    displayOrder: 2,
    isDefault: false,
    dailyTokenQuota: 5000000,
    allowCompareMode: true,
    allowJudgeMode: true,
    priceMonthly: 50,
  },
];

const connectionString = process.env.AUTH_DATABASE_URL;
if (!connectionString) {
  throw new Error('AUTH_DATABASE_URL must be set when running prisma db seed');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function upsertSystemPlan(def) {
  return prisma.plan.upsert({
    where: { slug: def.slug },
    update: {
      name: def.name,
      description: def.description,
      displayOrder: def.displayOrder,
      dailyTokenQuota: def.dailyTokenQuota,
      allowCompareMode: def.allowCompareMode,
      allowJudgeMode: def.allowJudgeMode,
    },
    create: {
      slug: def.slug,
      name: def.name,
      description: def.description,
      displayOrder: def.displayOrder,
      isDefault: def.isDefault,
      isActive: true,
      isPublic: true,
      dailyTokenQuota: def.dailyTokenQuota,
      allowCompareMode: def.allowCompareMode,
      allowJudgeMode: def.allowJudgeMode,
      priceMonthly: def.priceMonthly,
      currency: 'USD',
    },
  });
}

async function upsertSystemRole(def) {
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
  // Only seed grants if the role has none — preserves any admin edits made
  // through the roles admin UI on subsequent re-seeds.
  const existingGrants = await prisma.rolePermission.count({ where: { roleId: role.id } });
  if (existingGrants === 0) {
    await prisma.rolePermission.createMany({
      data: def.permissions.map((permission) => ({ roleId: role.id, permission })),
      skipDuplicates: true,
    });
    console.warn(`Seeded ${def.permissions.length} permissions for role ${def.slug}`);
  }
  return role;
}

async function seed() {
  // 1. System roles + grants (idempotent).
  const roleBySlug = {};
  for (const def of SYSTEM_ROLES) {
    roleBySlug[def.slug] = await upsertSystemRole(def);
  }

  // 2. Backfill roleId on any user that doesn't have one yet. ADMIN-enum users
  //    map to the ADMIN role; everyone else (USER/OPERATOR/VIEWER) maps to USER.
  const adminRoleId = roleBySlug['ADMIN'].id;
  const userRoleId = roleBySlug['USER'].id;
  const adminBackfill = await prisma.user.updateMany({
    where: { roleId: null, role: 'ADMIN' },
    data: { roleId: adminRoleId },
  });
  const userBackfill = await prisma.user.updateMany({
    where: { roleId: null, role: { not: 'ADMIN' } },
    data: { roleId: userRoleId },
  });
  if (adminBackfill.count + userBackfill.count > 0) {
    console.warn(`Backfilled roleId on ${adminBackfill.count + userBackfill.count} user(s)`);
  }

  // 3. System plans (idempotent) + backfill activePlanId on plan-less non-admin
  //    users to the default (Free) plan, with an ACTIVE assignment row.
  const planBySlug = {};
  for (const def of SYSTEM_PLANS) {
    planBySlug[def.slug] = await upsertSystemPlan(def);
  }
  const freePlanId = planBySlug['free'].id;
  const planless = await prisma.user.findMany({
    where: { activePlanId: null, role: { not: 'ADMIN' } },
    select: { id: true },
  });
  for (const u of planless) {
    await prisma.user.update({ where: { id: u.id }, data: { activePlanId: freePlanId } });
    await prisma.userPlanAssignment.create({
      data: { userId: u.id, planId: freePlanId, status: 'ACTIVE' },
    });
  }
  if (planless.length > 0) {
    console.warn(`Assigned ${planless.length} user(s) to the Free plan`);
  }

  // 4. Create the default admin only when there are no users at all.
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    console.warn('Users already exist — skipping admin creation.');
    return;
  }

  const passwordHash = await argon2.hash(ADMIN_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: ARGON2_MEMORY_COST,
    timeCost: ARGON2_TIME_COST,
    parallelism: ARGON2_PARALLELISM,
  });

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
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
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
