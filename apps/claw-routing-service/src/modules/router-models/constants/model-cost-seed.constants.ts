import { CostClass } from '../../../generated/prisma';
import { type ModelCostSeedEntry } from '../types/model-cost-seed.types';

/// Identity of the first-install price bootstrap. Bumping the version re-runs
/// the seed; changing the payload without bumping it is a checksum mismatch,
/// not a silent overwrite.
export const MODEL_COST_SEED_NAME = 'model-cost-list-prices-2026-v3';
export const MODEL_COST_SEED_VERSION = 3;

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

  // ── Image generation ─────────────────────────────────────────────────────
  //
  // Without a row here `findRate` returns null and every paid image generation
  // is refused with PAYG_PRICING_UNAVAILABLE — which is exactly what it was
  // doing: no image model had a price, so image generation could not run at
  // all, on any provider.
  //
  // KEYED AS THE IMAGE SERVICE SENDS THEM — bare, not the connector catalog's
  // `models/...` form. The reservation looks the price up by the string the
  // caller passes, so a row under a different spelling is a row nobody finds.
  //
  // Gemini bills a generated image as output TOKENS, so its published output
  // rate is the real rate and the hold prices itself correctly.
  //
  // OpenAI bills PER IMAGE, not per token. The reservation has only a token
  // ceiling to price from (IMAGE_PAYG_NOMINAL_OUTPUT_TOKENS = 8192), so the
  // per-image list price is expressed as the output rate that makes that
  // ceiling come out at the price of one image. It is not a per-token rate
  // OpenAI publishes; it is the per-image price divided by the ceiling, so the
  // hold matches what the image actually costs.
  Object.freeze({
    provider: 'GEMINI',
    modelKey: 'gemini-2.5-flash-image',
    inputPerMillionMicroUsd: 300_000,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 30_000_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
  Object.freeze({
    provider: 'GEMINI',
    modelKey: 'gemini-3.1-flash-image-preview',
    inputPerMillionMicroUsd: 300_000,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 30_000_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
  Object.freeze({
    provider: 'GEMINI',
    modelKey: 'gemini-3-pro-image-preview',
    inputPerMillionMicroUsd: 2_000_000,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 120_000_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.PREMIUM,
  }),
  // $0.040 per 1024x1024 standard image / 8192 nominal tokens.
  //
  // DALL-E publishes no per-token INPUT price — it bills per image. The input
  // rate is set equal to the output rate rather than 0 because
  // `hasUsablePricing` treats a zero rate as UNPRICED and would block the model
  // outright. It never charges anything: an image reservation passes 0 prompt
  // tokens, so this figure is always multiplied by zero.
  Object.freeze({
    provider: 'OPENAI',
    modelKey: 'dall-e-3',
    inputPerMillionMicroUsd: 4_882_813,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 4_882_813,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
  // $0.020 per 1024x1024 image / 8192 nominal tokens. Input rate mirrors the
  // output rate for the same reason as dall-e-3 above.
  Object.freeze({
    provider: 'OPENAI',
    modelKey: 'dall-e-2',
    inputPerMillionMicroUsd: 2_441_406,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 2_441_406,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.CHEAP,
  }),
  // $0.167 per 1024x1024 high-quality image / 8192 nominal tokens.
  Object.freeze({
    provider: 'OPENAI',
    modelKey: 'gpt-image-1',
    inputPerMillionMicroUsd: 10_000_000,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 20_385_742,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.PREMIUM,
  }),

  // ── Connector presets batch 2 (ADR-116/117) ─────────────────────────────
  //
  // Checked 2026-09-24, live via WebFetch against each provider's own pricing
  // page — cited per row. NOT copied from a preset or a changelog. A provider
  // in CONNECTOR_PRESETS with NO row here (Groq, Cerebras, Qwen, OpenRouter,
  // Vercel AI Gateway) is deliberately left unpriced rather than guessed:
  //   - Groq (groq.com/pricing, console.groq.com/pricing): both pages render
  //     their price table client-side; no number could be verified.
  //   - Cerebras (cerebras.ai/pricing, inference-docs.cerebras.ai/support/pricing):
  //     same — page renders the table client-side.
  //   - Qwen/Alibaba Model Studio (alibabacloud.com/help/en/model-studio/models):
  //     lists models, no price figures on the fetched page.
  //   - OpenRouter and Vercel AI Gateway are AGGREGATORS/pass-throughs: they
  //     charge the underlying provider's own list price per model (Vercel:
  //     "AI Gateway charges no markup and no platform fee on tokens", per
  //     vercel.com/docs/ai-gateway/pricing, 2026-09-24). There is no single
  //     per-aggregator rate to seed; each underlying model needs its own row,
  //     which is exactly what `findRate` already falls through to null for.
  // Per assumption A6, an unpriced model on a metered provider is BLOCKED, not
  // free — leaving these out is the safe default, not an oversight.
  Object.freeze({
    // mistral.ai/pricing, 2026-09-24: "Mistral Large costs $0.5 /M tokens in
    // and $1.5 /M tokens out."
    provider: 'MISTRAL',
    modelKey: 'mistral-large-latest',
    inputPerMillionMicroUsd: 500_000,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 1_500_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
  Object.freeze({
    // together.ai/pricing, 2026-09-24: Llama 3.3 70B serverless, $1.04/M
    // tokens in and out.
    provider: 'TOGETHER',
    modelKey: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    inputPerMillionMicroUsd: 1_040_000,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 1_040_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
  Object.freeze({
    // docs.fireworks.ai/serverless/pricing, 2026-09-24: unlisted models over
    // 16B parameters are billed a flat $0.90/M tokens in and out; 70B falls in
    // that bucket.
    provider: 'FIREWORKS',
    modelKey: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    inputPerMillionMicroUsd: 900_000,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 900_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
  Object.freeze({
    // deepinfra.com/pricing, 2026-09-24: meta-llama/Llama-3.3-70B-Instruct-Turbo
    // is $0.10/M input, $0.32/M output.
    provider: 'DEEPINFRA',
    modelKey: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    inputPerMillionMicroUsd: 100_000,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 320_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.CHEAP,
  }),
  Object.freeze({
    // cloud.sambanova.ai/plans/pricing, 2026-09-24: Meta-Llama-3.3-70B-Instruct
    // is $0.60/M input, $1.20/M output.
    provider: 'SAMBANOVA',
    modelKey: 'Meta-Llama-3.3-70B-Instruct',
    inputPerMillionMicroUsd: 600_000,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 1_200_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
  Object.freeze({
    // developers.cloudflare.com/workers-ai/platform/pricing, 2026-09-24:
    // @cf/meta/llama-3.3-70b-instruct-fp8-fast is $0.293/M input tokens (26,668
    // neurons), $2.253/M output tokens (204,805 neurons) at $0.011/1,000 neurons.
    provider: 'CLOUDFLARE',
    modelKey: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    inputPerMillionMicroUsd: 293_000,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 2_253_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
  Object.freeze({
    // docs.perplexity.ai/getting-started/pricing, 2026-09-24: "sonar" base
    // model is $1.00/M tokens in and out (excludes the separate per-request
    // search fee, which is not a token rate and cannot be expressed here).
    provider: 'PERPLEXITY',
    modelKey: 'sonar',
    inputPerMillionMicroUsd: 1_000_000,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 1_000_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
  Object.freeze({
    // cohere.com/pricing, 2026-09-24: Command R+ 08-2024 is $2.50/M input,
    // $10.00/M output — Cohere's most capable Command model.
    provider: 'COHERE',
    modelKey: 'command-r-plus-08-2024',
    inputPerMillionMicroUsd: 2_500_000,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 10_000_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.PREMIUM,
  }),
  Object.freeze({
    // docs.z.ai/guides/overview/pricing, 2026-09-24: GLM-4.6 is $0.60/M
    // input, $2.20/M output.
    provider: 'ZAI',
    modelKey: 'glm-4.6',
    inputPerMillionMicroUsd: 600_000,
    cachedInputPerMillionMicroUsd: null,
    outputPerMillionMicroUsd: 2_200_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
  Object.freeze({
    // platform.kimi.ai/docs/pricing/chat (Moonshot's pricing docs redirect
    // here), 2026-09-24: kimi-k2.6 is $0.16/M cache-hit input, $0.95/M
    // cache-miss input, $4.00/M output. cachedInput below is the cache-HIT
    // rate; the seeded input rate is the cache-MISS (peak) rate so the wallet
    // never under-reserves.
    provider: 'MOONSHOT',
    modelKey: 'kimi-k2.6',
    inputPerMillionMicroUsd: 950_000,
    cachedInputPerMillionMicroUsd: 160_000,
    outputPerMillionMicroUsd: 4_000_000,
    reasoningPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    costClass: CostClass.STANDARD,
  }),
]);
