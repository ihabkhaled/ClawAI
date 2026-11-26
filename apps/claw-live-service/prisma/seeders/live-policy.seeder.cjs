// Seeds the default Live Intelligence policy (version 1, owner decision 2026-11-22).
//
// Idempotent: it inserts version 1 ONLY when live_policy_versions has no rows at all, so an
// administrator's later versions (and a deliberately deactivated state) are never overwritten.
// Two exceptions, also idempotent: the 2026-11-24 and 2026-11-26 upgrades (see `upgrade`).
// `activeKey = 'active'` is the emulated partial unique index that marks the one live version.
//
// Run: `npm run seed` (dev entrypoint, `prisma db seed` when SEED_ON_START=true in prod).

const fs = require('node:fs');
const path = require('node:path');

const ACTIVE_KEY = 'active';
const SEED_NOTE = 'seed v1 (owner decision 2026-11-22)';

const PAID_MICRO_USD_PER_MINUTE = 20000;

// ADR-221 batch 6 (owner decision 2026-11-24): recorded videos and 24 more platforms.
const RECORDED_VIDEO_MAX_SECONDS = 10800;
const UPGRADE_NOTE = 'seed upgrade: recorded videos + 24 platforms (owner decision 2026-11-24)';
const PLATFORMS_ADDED_2026_11_24 = [
  'DAILYMOTION',
  'X',
  'VIMEO',
  'TROVO',
  'DLIVE',
  'HUYA',
  'DOUYU',
  'DOUYIN',
  'TWITCASTING',
  'NICONICO',
  'PICARTO',
  'ODYSEE',
  'RUTUBE',
  'VK',
  'OK',
  'REDDIT',
  'STREAMABLE',
  'NAVER_TV',
  'KAKAO_TV',
  'WEIBO',
  'SHOWROOM',
  'LIVE17',
  'MIXCLOUD',
  'BLUESKY',
];

// Platforms the server reads from 2026-11-26 (owner: more than 30 live and 30 video platforms).
const PLATFORMS_ADDED_2026_11_26 = [
  'VK_PLAY_LIVE',
  'PEERTUBE',
  'STEAM',
  'GOODGAME',
  'YOUNOW',
  'RAIPLAY',
  'RAIPLAY_SOUND',
  'BFMTV',
  'CBS_NEWS',
  'LRT',
  'FRANCE_TV',
  'ROYA',
  'MATCH_TV',
  'RTVC_PLAY',
  'TUNEIN',
  'WEBCAMERA_PL',
  'TED',
  'SOUNDCLOUD',
  'BANDCAMP',
  'ARCHIVE_ORG',
  'NINEGAG',
  'PINTEREST',
  'BITCHUTE',
  'GOOGLE_DRIVE',
  'DROPBOX',
  'LOOM',
  'SPREAKER',
  'APPLE_PODCASTS',
  'MEDAL',
  'UN_WEB_TV',
  'ZHIHU',
  'CNN',
  'VIDLII',
  'FLICKR',
  'ACFUN',
  'IMGUR',
];

// Council agents (owner decision 2026-11-26): 1..3 extra agents each draft, the main model merges.
const COUNCIL_UPGRADE_NOTE = 'seed upgrade: council agents (owner decision 2026-11-26)';
const DEFAULT_COUNCIL_MODEL_CHAIN = [
  { connector: 'GEMINI', model: 'gemini-3.1-flash-lite', style: 'OPENAI_COMPAT' },
];

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
  // Extra agents that each draft the summary; summaryModelChain merges (owner decision 2026-11-26).
  councilModelChain: DEFAULT_COUNCIL_MODEL_CHAIN,
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
    ...PLATFORMS_ADDED_2026_11_24,
    ...PLATFORMS_ADDED_2026_11_26,
  ],
  // Recorded videos (owner decision 2026-11-24): played along, at most 3 hours; 0 turns them off.
  recordedVideoMaxSeconds: RECORDED_VIDEO_MAX_SECONDS,
  featureEnabled: true,
};

/** @param {any} prisma */
async function run(prisma) {
  const existing = await prisma.livePolicyVersion.count();
  if (existing > 0) return upgrade(prisma);
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

/**
 * One-time upgrades of an existing policy, applied in date order. Each inserts a new active version
 * that copies every value and adds only what its day introduced, and each runs only while the active
 * config lacks its field, so an administrator's later choices are never overwritten.
 * - 2026-11-24: the day's platforms join `serverPullPlatforms`; `recordedVideoMaxSeconds` is set.
 * - 2026-11-26: `councilModelChain` gets the one default agent; a non-empty `serverPullPlatforms`
 *   also gets the day's 36 platforms.
 * @param {any} prisma
 */
async function upgrade(prisma) {
  const active = await prisma.livePolicyVersion.findUnique({ where: { activeKey: ACTIVE_KEY } });
  if (!active || active.config === null || typeof active.config !== 'object') {
    return { inserted: false, reason: 'policy rows already exist' };
  }
  let config = active.config;
  const versions = [];
  if (!('recordedVideoMaxSeconds' in config)) {
    const platforms = Array.isArray(config.serverPullPlatforms)
      ? config.serverPullPlatforms
      : DEFAULT_POLICY_CONFIG.serverPullPlatforms;
    config = {
      ...config,
      serverPullPlatforms: [...new Set([...platforms, ...PLATFORMS_ADDED_2026_11_24])],
      recordedVideoMaxSeconds: RECORDED_VIDEO_MAX_SECONDS,
    };
    versions.push(await insertActiveVersion(prisma, config, UPGRADE_NOTE));
  }
  if (!('councilModelChain' in config)) {
    // Server pull left on (a non-empty list) also reads the day's new platforms; off stays off.
    const platforms = Array.isArray(config.serverPullPlatforms) ? config.serverPullPlatforms : [];
    const widened =
      platforms.length > 0
        ? [...new Set([...platforms, ...PLATFORMS_ADDED_2026_11_26])]
        : platforms;
    config = {
      ...config,
      councilModelChain: DEFAULT_COUNCIL_MODEL_CHAIN,
      serverPullPlatforms: widened,
    };
    versions.push(await insertActiveVersion(prisma, config, COUNCIL_UPGRADE_NOTE));
  }
  if (versions.length === 0) {
    return { inserted: false, reason: 'policy rows already exist and are current' };
  }
  return {
    inserted: true,
    reason: `upgraded the active policy to version ${versions.map(String).join(', ')}`,
  };
}

/**
 * Deactivates the current version and inserts `config` as the next active one.
 * @param {any} prisma
 * @param {Record<string, unknown>} config
 * @param {string} note
 */
async function insertActiveVersion(prisma, config, note) {
  return prisma.$transaction(async (tx) => {
    const latest = await tx.livePolicyVersion.aggregate({ _max: { version: true } });
    await tx.livePolicyVersion.updateMany({
      where: { activeKey: ACTIVE_KEY },
      data: { activeKey: null },
    });
    const next = (latest._max.version ?? 0) + 1;
    await tx.livePolicyVersion.create({
      data: { version: next, activeKey: ACTIVE_KEY, config, note },
    });
    return next;
  });
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

module.exports = {
  PLATFORMS_ADDED_2026_11_26,
  run,
  DEFAULT_POLICY_CONFIG,
  ACTIVE_KEY,
  SEED_NOTE,
  UPGRADE_NOTE,
  COUNCIL_UPGRADE_NOTE,
  DEFAULT_COUNCIL_MODEL_CHAIN,
  PLATFORMS_ADDED_2026_11_24,
};
