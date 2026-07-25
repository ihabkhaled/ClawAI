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

// costCeilingMicroUsd arrives as a STRING because JSON has no BigInt. Money is
// never a float here, so it is widened to BigInt rather than Number.
const PLAN_CATALOG = catalogData.plans.map((plan) => ({
  ...plan,
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

function planColumns(definition) {
  return {
    name: definition.name,
    description: definition.description,
    displayOrder: definition.displayOrder,
    isDefault: definition.isDefault,
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
  version: 1,
  payload: PLAN_CATALOG.map((plan) => ({
    slug: plan.slug,
    monthlyMinor: plan.monthlyMinor,
    yearlyMinor: plan.yearlyMinor,
    dailyTokens: plan.dailyTokens,
    weeklyTokens: plan.weeklyTokens,
    monthlyTokens: plan.monthlyTokens,
    costCeiling: String(plan.monthlyCostCeilingMicroUsd),
  })),
  run,
  PLAN_CATALOG,
  matchesLegacyFingerprint,
  booleanProjections,
};
