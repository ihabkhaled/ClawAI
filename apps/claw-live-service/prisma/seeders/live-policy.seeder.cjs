// Seeds the default Live Intelligence policy (version 1, owner decision 2026-11-22).
//
// Idempotent: it inserts version 1 ONLY when live_policy_versions has no rows at all, so an
// administrator's later versions (and a deliberately deactivated state) are never overwritten.
// `activeKey = 'active'` is the emulated partial unique index that marks the one live version.
//
// Run: `npm run seed` (dev entrypoint, `prisma db seed` when SEED_ON_START=true in prod).

const fs = require('node:fs');
const path = require('node:path');

const ACTIVE_KEY = 'active';
const SEED_NOTE = 'seed v1 (owner decision 2026-11-22)';

const PAID_MICRO_USD_PER_MINUTE = 20000;

function plan(freeSecondsPerMonth) {
  return { freeSecondsPerMonth, paidMicroUsdPerMinute: PAID_MICRO_USD_PER_MINUTE };
}

const DEFAULT_POLICY_CONFIG = {
  killSwitch: false,
  plans: {
    free: plan(1800),
    starter: plan(7200),
    plus: plan(18000),
    pro: plan(36000),
    team: plan(36000),
    scale: plan(36000),
    unlimited: plan(36000),
    // Staff accounts sit on the 'admin' plan; without this row they fell to defaultPlan (0 min).
    admin: plan(36000),
  },
  defaultPlan: plan(0),
  visionBilling: 'ACTUAL_COST',
  graceSeconds: 60,
  maxActiveStreams: 20,
  maxSessionsPerUser: 3,
  sessionsPerUserPerHour: 30,
  dailyBudgetMicroUsd: 20000000,
  budgetSoftStopPercent: 80,
  summaryModelChain: [
    { connector: 'OLLAMA', model: 'gemma4:31b', style: 'OLLAMA' },
    { connector: 'OLLAMA', model: 'deepseek-v4.1-flash', style: 'OLLAMA' },
    { connector: 'GEMINI', model: 'gemini-3.1-flash-lite', style: 'OPENAI_COMPAT' },
  ],
  visionModelChain: [
    { connector: 'GEMINI', model: 'gemini-3.1-flash-lite', style: 'OPENAI_COMPAT' },
  ],
  // Server pull (ADR-221 addendum 2026-11-23): the server reads Twitch's public playlist itself.
  // Every platform except Discord (owner decision 2026-11-23): Twitch natively, the rest via yt-dlp.
  serverPullPlatforms: [
    'YOUTUBE',
    'TWITCH',
    'KICK',
    'FACEBOOK',
    'TIKTOK',
    'INSTAGRAM',
    'RUMBLE',
    'BIGO',
    'LINKEDIN',
    'TELEGRAM',
    'BILIBILI',
    'CHZZK',
    'SOOP',
    'NIMO',
  ],
  featureEnabled: true,
};

/** @param {{ livePolicyVersion: { count: Function, create: Function } }} prisma */
async function run(prisma) {
  const existing = await prisma.livePolicyVersion.count();
  if (existing > 0) {
    return { inserted: false, reason: 'policy rows already exist' };
  }
  await prisma.livePolicyVersion.create({
    data: {
      version: 1,
      activeKey: ACTIVE_KEY,
      config: DEFAULT_POLICY_CONFIG,
      note: SEED_NOTE,
    },
  });
  return { inserted: true, reason: 'seeded version 1' };
}

function loadGeneratedClient() {
  const candidates = [
    path.join(__dirname, '..', '..', 'dist', 'generated', 'prisma'),
    path.join(__dirname, '..', '..', 'src', 'generated', 'prisma'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.js')));
  if (!found) {
    throw new Error('Generated Prisma client not found; run `npm run prisma:generate` first');
  }
  return require(found);
}

async function main() {
  const url = process.env.LIVE_DATABASE_URL;
  if (!url) {
    throw new Error('LIVE_DATABASE_URL is required to seed the live policy');
  }
  const { PrismaClient } = loadGeneratedClient();
  const { PrismaPg } = require('@prisma/adapter-pg');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const outcome = await run(prisma);
    console.log(`[live-policy.seeder] ${outcome.reason}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[live-policy.seeder] failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

module.exports = { run, DEFAULT_POLICY_CONFIG, ACTIVE_KEY, SEED_NOTE };
