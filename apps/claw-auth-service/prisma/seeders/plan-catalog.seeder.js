// Versioned plan-catalog seeder: the seven public plans, their versioned
// prices, quota ceilings, product limits, model-access policy and feature rules.
//
// Money is integer minor units ($5.00 => 500) and provider cost is integer
// micro-USD ($0.75 => 750000). No float ever touches a billing value.
//
// The existing free/pro/team rows predate billing and may have been edited by an
// administrator. This seeder updates them ONLY when they still match the old
// system-seed fingerprint; an edited row is left alone and reported. Getting
// this wrong would silently overwrite a customer's tuned production plan.

const FREE = 'free';

// dailyTokens / weeklyTokens / monthlyTokens are cost-normalized ("weighted")
// tokens: 1,000,000 weighted tokens == $1.00 of estimated provider cost.
// monthlyCostCeilingMicroUsd is an internal profitability control and is NEVER
// returned to a normal user.
const catalogData = require('./plan-catalog.json');

for (const plan of catalogData.plans) {
  if (plan.isTrial === true && plan.trialDurationDays !== 30) {
    throw new Error(`Trial plan ${plan.slug} must have exactly 30 days`);
  }
}

// costCeilingMicroUsd arrives as a STRING because JSON has no BigInt. Money is
// never a float here, so it is widened to BigInt rather than Number.
const PLAN_CATALOG = catalogData.plans.map((plan) => ({
  ...plan,
  isTrial: plan.isTrial === true,
  trialDurationDays: plan.isTrial === true ? plan.trialDurationDays : null,
  monthlyCostCeilingMicroUsd: BigInt(plan.costCeilingMicroUsd),
}));

// What the pre-billing seeder wrote for free/pro/team. A row still matching one
// of these is untouched by an administrator and is safe to upgrade in place.
const LEGACY_FINGERPRINTS = {
  free: { dailyTokenQuota: 50_000, allowJudgeMode: false, allowResearchMode: false },
  pro: { dailyTokenQuota: 500_000, allowJudgeMode: true, allowResearchMode: true },
  team: { dailyTokenQuota: 5_000_000, allowJudgeMode: true, allowResearchMode: true },
};

function matchesLegacyFingerprint(plan) {
  const fingerprint = LEGACY_FINGERPRINTS[plan.slug];
  if (!fingerprint) {
    return false;
  }
  return Object.entries(fingerprint).every(([field, value]) => plan[field] === value);
}

// Boolean projections kept in sync with the feature rules so existing callers
// that still read Plan.allow* keep working during the compatibility window.
function booleanProjections(features) {
  const enabled = (key) => features[key].accessMode !== 'DISABLED';
  return {
    allowCompareMode: enabled('COMPARE_MODE'),
    allowJudgeMode: enabled('JUDGE_MODE'),
    allowResearchMode: enabled('RESEARCH_MODE'),
    allowCriticReview: enabled('CRITIC_REVIEW'),
    allowWorkspaces: enabled('WORKSPACES'),
    allowMemory: enabled('MEMORY'),
    allowContextPacks: enabled('CONTEXT_PACKS'),
  };
}

// The 9 orchestration-lab gates are plain per-plan booleans (no quota/limit
// tracking, unlike the features map above) — a lab is either available on a
// tier or it isn't. Read straight off `definition.labs` rather than routing
// through PlanFeatureKey/PlanFeatureRule, which exists for usage-limited
// trials this simple on/off gate doesn't need.
function labGateProjections(labs) {
  return {
    allowConsensusMode: labs.consensusMode === true,
    allowEscalationChain: labs.escalationChain === true,
    allowRepairLab: labs.repairLab === true,
    allowTaskDecomposer: labs.taskDecomposer === true,
    allowBestOfN: labs.bestOfN === true,
    allowVerifier: labs.verifier === true,
    allowPipelineLab: labs.pipelineLab === true,
    allowCostEnsemble: labs.costEnsemble === true,
    allowRolePack: labs.rolePack === true,
  };
}

// Mirrors POPULAR_PLAN_KEY in src/modules/plans/constants/popular-plan.constants.ts.
// The seeder is plain JS run by `prisma db seed` and cannot import the TS source.
const POPULAR_PLAN_KEY = 'popular';

function planColumns(definition) {
  return {
    name: definition.name,
    description: definition.description,
    displayOrder: definition.displayOrder,
    isDefault: definition.isDefault,
    // Deliberately NOT version-bumped for this field. Existing installs get the
    // badge from migration 20260827200000, which backfills `pro`; bumping the
    // catalog version would re-run the whole seed and could overwrite quotas an
    // operator has since edited. Fresh installs take it from here.
    isPopular: definition.isPopular === true,
    popularKey: definition.isPopular === true ? POPULAR_PLAN_KEY : null,
    isTrial: definition.isTrial,
    trialDurationDays: definition.trialDurationDays,
    isActive: true,
    isPublic: true,
    currency: 'USD',
    // Legacy decimal columns stay populated for compatibility; the versioned
    // price rows below are the authoritative billing source.
    priceMonthly: definition.monthlyMinor / 100,
    priceYearly: definition.yearlyMinor === null ? null : definition.yearlyMinor / 100,
    dailyTokenQuota: definition.dailyTokens,
    weeklyTokenQuota: definition.weeklyTokens,
    monthlyTokenQuota: definition.monthlyTokens,
    monthlyProviderCostCeilingMicroUsd: definition.monthlyCostCeilingMicroUsd,
    maxConcurrentRequests: definition.maxConcurrentRequests,
    maxChatsPerDay: definition.chatsPerDay,
    maxMessagesPerDay: definition.messagesPerDay,
    maxWorkspaceConnections: definition.workspaces,
    maxContextPacks: definition.contextPacks,
    maxMemoryItems: definition.memoryItems,
    modelAccessMode: definition.modelAccessMode,
    allowedCostClasses: definition.allowedCostClasses,
    ...booleanProjections(definition.features),
    ...labGateProjections(definition.labs),
  };
}

async function upsertPrices(prisma, planId, definition) {
  const intervals = [
    ['MONTHLY', definition.monthlyMinor],
    ['YEARLY', definition.yearlyMinor],
  ];
  for (const [billingInterval, amountMinor] of intervals) {
    if (amountMinor === null) {
      continue;
    }
    const activeKey = `${planId}:${billingInterval}`;
    const existing = await prisma.planPriceVersion.findUnique({ where: { activeKey } });
    if (existing) {
      continue;
    }
    await prisma.planPriceVersion.create({
      data: {
        planId,
        billingInterval,
        currency: 'USD',
        amountMinor,
        version: 1,
        isActive: true,
        activeKey,
      },
    });
  }
}

async function upsertFeatureRules(prisma, planId, features) {
  for (const [feature, rule] of Object.entries(features)) {
    await prisma.planFeatureRule.upsert({
      where: { planId_feature: { planId, feature } },
      update: {},
      create: {
        planId,
        feature,
        accessMode: rule.accessMode,
        limit: rule.limit,
        window: rule.window,
      },
    });
  }
}

async function run(prisma) {
  const report = { created: [], upgraded: [], preserved: [] };

  for (const definition of PLAN_CATALOG) {
    const existing = await prisma.plan.findUnique({ where: { slug: definition.slug } });
    let planId;

    if (!existing) {
      const created = await prisma.plan.create({
        data: { slug: definition.slug, ...planColumns(definition) },
      });
      planId = created.id;
      report.created.push(definition.slug);
    } else if (matchesLegacyFingerprint(existing)) {
      // Still the untouched pre-billing baseline → safe to bring forward.
      await prisma.plan.update({ where: { id: existing.id }, data: planColumns(definition) });
      planId = existing.id;
      report.upgraded.push(definition.slug);
    } else {
      // Administrator-edited. Add the billing columns it cannot have had before,
      // but leave every tunable value exactly as the administrator set it.
      await prisma.plan.update({
        where: { id: existing.id },
        data: {
          modelAccessMode: existing.modelAccessMode,
          weeklyTokenQuota:
            existing.weeklyTokenQuota === null
              ? definition.weeklyTokens
              : existing.weeklyTokenQuota,
        },
      });
      planId = existing.id;
      report.preserved.push(definition.slug);
    }

    await upsertPrices(prisma, planId, definition);
    await upsertFeatureRules(prisma, planId, definition.features);
  }

  // Pre-billing manual assignments become MIGRATION grants. They are NOT
  // converted into paid subscriptions — fabricating a payment that never
  // happened would corrupt every revenue report downstream.
  const backfilled = await prisma.userPlanAssignment.updateMany({
    where: { grantType: 'FREE_DEFAULT', plan: { slug: { not: FREE } } },
    data: { grantType: 'MIGRATION', grantReason: 'Pre-billing manual plan assignment' },
  });
  report.migratedAssignments = backfilled.count;

  console.warn(
    `[seed] plan-catalog: created=${report.created.length} upgraded=${report.upgraded.length} ` +
      `preserved=${report.preserved.length} migratedAssignments=${report.migratedAssignments}`,
  );
  if (report.preserved.length > 0) {
    console.warn(
      `[seed] plan-catalog: kept administrator-edited values for ${report.preserved.join(', ')}`,
    );
  }
  return report;
}

module.exports = {
  name: 'plan-catalog',
  // v2: added the 9 orchestration-lab gates (definition.labs). Payload now
  // includes `labs` so a future change to the per-tier lab defaults is
  // detected by the checksum instead of silently not re-applying.
  //
  // DELIBERATELY NOT BUMPED to v3 for the PAYG allowance change, and this is
  // the same reasoning as the `isPopular` note in planColumns above. Trace
  // run() on an install where v2 has already completed: `existing` is truthy
  // for all seven plans, so the create branch never fires, and
  // matchesLegacyFingerprint returns false for every one of them (the v2 seed
  // already moved them off the legacy values), so every plan falls to the else
  // branch — which writes only modelAccessMode and a null weeklyTokenQuota. A
  // v3 bump would therefore apply the new allowances to ZERO rows while
  // reporting success, and would burn the version number that a genuine future
  // catalog change needs.
  //
  // Existing installs are migrated by plan-payg-allowance.seeder.js instead,
  // which targets rows still holding the OLD value so an operator's tuned
  // figure is never overwritten. The numbers in plan-catalog.json are for
  // FRESH installs, which take them through the create branch above.
  version: 2,
  payload: PLAN_CATALOG.map((plan) => ({
    slug: plan.slug,
    monthlyMinor: plan.monthlyMinor,
    yearlyMinor: plan.yearlyMinor,
    dailyTokens: plan.dailyTokens,
    weeklyTokens: plan.weeklyTokens,
    monthlyTokens: plan.monthlyTokens,
    labs: plan.labs,
    costCeiling: String(plan.monthlyCostCeilingMicroUsd),
  })),
  run,
  PLAN_CATALOG,
  matchesLegacyFingerprint,
  booleanProjections,
  labGateProjections,
};
