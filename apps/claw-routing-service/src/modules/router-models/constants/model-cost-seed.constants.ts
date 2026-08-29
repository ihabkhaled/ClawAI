import { CostClass } from '../../../generated/prisma';
import { type ModelCostSeedEntry } from '../types/model-cost-seed.types';

/// Identity of the first-install price bootstrap. Bumping the version re-runs
/// the seed; changing the payload without bumping it is a checksum mismatch,
/// not a silent overwrite.
export const MODEL_COST_SEED_NAME = 'model-cost-list-prices-2026-v1';
export const MODEL_COST_SEED_VERSION = 1;

/// Next in routing-service's 740_040_00N advisory-lock block (001 = deployment
/// backfill, 002 = router chain). Distinct from payment-service's 740_018_001
/// so the locks can never collide if the two services ever share a database.
export const MODEL_COST_SEED_LOCK_ID = 740_040_003;

/// Stamped on every seeded row so an operator can tell a bootstrap price from a
/// synced or hand-entered one at a glance, without joining the seed ledger.
export const MODEL_COST_SEED_NOTES =
  'Seeded from the provider public price card. LIST price, not a negotiated rate — verify before relying on it for margin.';

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC LIST PRICES, 2026. READ THIS BEFORE CHANGING A NUMBER.
//
// WHY THIS FILE EXISTS AT ALL.
// `ModelCostVersion` had a schema, a service, a controller and a spec but no
// seeder, so on a fresh install the price table was EMPTY. Under assumption A6
// of the PAYG plan ("unpriced model on a PAYG provider = blocked, never free"),
// an empty table refuses every paid request on day one. This is the bootstrap
// that stops that happening; it is launch-blocking, not a nicety.
//
// WHAT THESE NUMBERS ARE.
// LIST prices copied from each provider's public pricing card, in integer
// micro-USD per MILLION tokens. `$1.25 / 1M tokens` is `1_250_000`, because
// MICRO_USD_PER_USD is 1_000_000. They are seeded as
// `source: SEED, confidence: ESTIMATED, isAdminOverride: false`.
//
// WHAT THESE NUMBERS ARE NOT.
// They are NOT a contract, NOT a negotiated enterprise rate, and NOT
// guaranteed current — provider price cards move and this file does not. They
// are ESTIMATES an operator is expected to verify against their own invoices
// before treating the wallet's arithmetic as a margin number. Regional
// surcharges, long-context tiers (Gemini above 200k, Anthropic above 200k),
// batch discounts and volume commitments are all deliberately out of scope: a
// single per-model rate cannot express them, and pretending otherwise would be
// worse than an estimate that admits it is one.
//
// TWO INVARIANTS THAT MUST SURVIVE EVERY EDIT.
//  1. `isAdminOverride: false` and `source: SEED`, so a later automated sync
//     MAY update these rows. `ModelCostService.applySyncedRates` refuses to
//     touch a row an administrator has pinned — an admin override must NEVER
//     be clobbered, by this seed or by a nightly scrape, because losing a
//     hand-negotiated rate silently mis-bills every request on that model.
//  2. The seed only ever FILLS A GAP. A model that already has any price
//     history is skipped entirely, so re-running this can never overwrite a
//     price someone else set.
//
// REASONING TOKENS. No provider publishes a reasoning rate that differs from
// its output rate — reasoning/thinking tokens are billed as output everywhere.
// `reasoningPerMillionMicroUsd` is therefore set equal to the output rate on
// models that report a separate reasoning count, and left null on models that
// do not. Both are numerically identical, because `calculateCostMicroUsd`
// already falls back to the output rate when the reasoning rate is null; the
// explicit value documents that the equality was checked rather than assumed.
// The buckets are summed as DISJOINT quantities, so a caller must never pass
// reasoning tokens inside `outputTokens` as well.
//
// CACHE WRITES. Only Anthropic charges separately to write a cache entry
// (1.25x input for the 5-minute TTL). Everyone else folds it into the input
// rate, so `cacheWritePerMillionMicroUsd` is null for them rather than 0 —
// null means "not published", 0 would mean "free".
// ═══════════════════════════════════════════════════════════════════════════

export const MODEL_COST_SEED_ENTRIES: readonly ModelCostSeedEntry[] = Object.freeze([
  // ── OpenAI ───────────────────────────────────────────────────────────────
  Object.freeze({
    provider: 'OPENAI',
    modelKey: 'gpt-5',
    inputPerMillionMicroUsd: 1_250_000,
    cachedInputPerMillionMicroUsd: 125_000,
    outputPerMillionMicroUsd: 10_000_000,
    reasoningPerMillionMicroUsd: 10_000_000,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.PREMIUM,
  }),
  Object.freeze({
    provider: 'OPENAI',
    modelKey: 'gpt-5-mini',
    inputPerMillionMicroUsd: 250_000,
    cachedInputPerMillionMicroUsd: 25_000,
    outputPerMillionMicroUsd: 2_000_000,
    reasoningPerMillionMicroUsd: 2_000_000,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
  Object.freeze({
    provider: 'OPENAI',
    modelKey: 'gpt-4o',
    inputPerMillionMicroUsd: 2_500_000,
    cachedInputPerMillionMicroUsd: 1_250_000,
    outputPerMillionMicroUsd: 10_000_000,
    // Not a reasoning model: it reports no separate reasoning token count.
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.PREMIUM,
  }),
  Object.freeze({
    provider: 'OPENAI',
    modelKey: 'gpt-4o-mini',
    inputPerMillionMicroUsd: 150_000,
    cachedInputPerMillionMicroUsd: 75_000,
    outputPerMillionMicroUsd: 600_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.CHEAP,
  }),
  Object.freeze({
    provider: 'OPENAI',
    modelKey: 'o3',
    inputPerMillionMicroUsd: 2_000_000,
    cachedInputPerMillionMicroUsd: 500_000,
    outputPerMillionMicroUsd: 8_000_000,
    reasoningPerMillionMicroUsd: 8_000_000,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.PREMIUM,
  }),
  Object.freeze({
    provider: 'OPENAI',
    modelKey: 'o4-mini',
    inputPerMillionMicroUsd: 1_100_000,
    cachedInputPerMillionMicroUsd: 275_000,
    outputPerMillionMicroUsd: 4_400_000,
    reasoningPerMillionMicroUsd: 4_400_000,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),

  // ── Anthropic ────────────────────────────────────────────────────────────
  // The only provider that publishes a distinct cache-WRITE rate (1.25x input
  // for the 5-minute TTL). Cache reads are 0.1x input.
  Object.freeze({
    provider: 'ANTHROPIC',
    modelKey: 'claude-opus-4',
    inputPerMillionMicroUsd: 15_000_000,
    cachedInputPerMillionMicroUsd: 1_500_000,
    outputPerMillionMicroUsd: 75_000_000,
    reasoningPerMillionMicroUsd: 75_000_000,
    cacheWritePerMillionMicroUsd: 18_750_000,
    costClass: CostClass.ULTRA,
  }),
  Object.freeze({
    provider: 'ANTHROPIC',
    modelKey: 'claude-sonnet-4',
    inputPerMillionMicroUsd: 3_000_000,
    cachedInputPerMillionMicroUsd: 300_000,
    outputPerMillionMicroUsd: 15_000_000,
    reasoningPerMillionMicroUsd: 15_000_000,
    cacheWritePerMillionMicroUsd: 3_750_000,
    costClass: CostClass.PREMIUM,
  }),
  Object.freeze({
    provider: 'ANTHROPIC',
    modelKey: 'claude-haiku-4-5',
    inputPerMillionMicroUsd: 1_000_000,
    cachedInputPerMillionMicroUsd: 100_000,
    outputPerMillionMicroUsd: 5_000_000,
    reasoningPerMillionMicroUsd: 5_000_000,
    cacheWritePerMillionMicroUsd: 1_250_000,
    costClass: CostClass.STANDARD,
  }),

  // ── Google Gemini ────────────────────────────────────────────────────────
  // Rates are the STANDARD context tier. Gemini charges more above 200k input
  // tokens; a single per-model rate cannot express that, so long-context
  // requests are under-priced here and an operator should verify.
  Object.freeze({
    provider: 'GEMINI',
    modelKey: 'gemini-2.5-pro',
    inputPerMillionMicroUsd: 1_250_000,
    cachedInputPerMillionMicroUsd: 310_000,
    outputPerMillionMicroUsd: 10_000_000,
    reasoningPerMillionMicroUsd: 10_000_000,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.PREMIUM,
  }),
  Object.freeze({
    provider: 'GEMINI',
    modelKey: 'gemini-2.5-flash',
    inputPerMillionMicroUsd: 300_000,
    cachedInputPerMillionMicroUsd: 75_000,
    outputPerMillionMicroUsd: 2_500_000,
    reasoningPerMillionMicroUsd: 2_500_000,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
  Object.freeze({
    provider: 'GEMINI',
    modelKey: 'gemini-2.5-flash-lite',
    inputPerMillionMicroUsd: 100_000,
    cachedInputPerMillionMicroUsd: 25_000,
    outputPerMillionMicroUsd: 400_000,
    reasoningPerMillionMicroUsd: 400_000,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.CHEAP,
  }),

  // ── DeepSeek ─────────────────────────────────────────────────────────────
  // `cachedInput` here is DeepSeek's cache-HIT input price. Off-peak discounts
  // are not modelled: the rate is the peak (higher) one, so the wallet never
  // under-reserves.
  Object.freeze({
    provider: 'DEEPSEEK',
    modelKey: 'deepseek-chat',
    inputPerMillionMicroUsd: 270_000,
    cachedInputPerMillionMicroUsd: 70_000,
    outputPerMillionMicroUsd: 1_100_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
  Object.freeze({
    provider: 'DEEPSEEK',
    modelKey: 'deepseek-reasoner',
    inputPerMillionMicroUsd: 550_000,
    cachedInputPerMillionMicroUsd: 140_000,
    outputPerMillionMicroUsd: 2_190_000,
    reasoningPerMillionMicroUsd: 2_190_000,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),

  // ── xAI Grok ─────────────────────────────────────────────────────────────
  Object.freeze({
    provider: 'GROK',
    modelKey: 'grok-4',
    inputPerMillionMicroUsd: 3_000_000,
    cachedInputPerMillionMicroUsd: 750_000,
    outputPerMillionMicroUsd: 15_000_000,
    reasoningPerMillionMicroUsd: 15_000_000,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.PREMIUM,
  }),
  Object.freeze({
    provider: 'GROK',
    modelKey: 'grok-3-mini',
    inputPerMillionMicroUsd: 300_000,
    cachedInputPerMillionMicroUsd: 75_000,
    outputPerMillionMicroUsd: 500_000,
    reasoningPerMillionMicroUsd: 500_000,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.CHEAP,
  }),
]);
