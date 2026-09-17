import { RouterErrorCode } from '../../../common/enums';
import {
  BillingModel,
  LowConfidenceAction,
  RouterChainEntryRole,
  RouterConfigurationMode,
  RouterProvider,
} from '../../../generated/prisma';
import type { ChainSeedEntry, RouterConfigurationSeed } from '../types/router-chain-seed.types';

export const ROUTER_CHAIN_SEED_NAME = 'cloud-smart-router-default-v1';
// Bumped 1 -> 2 (2026-08-16): realistic per-entry/total timeouts, per the
// live-UAT finding above. A new version publishes a fresh revision rather
// than mutating the applied v1 row - the seed service's own documented
// mechanism for shipping a changed default chain, and it never touches an
// admin's own edits to the live configuration.
//
// Bumped 2 -> 3 (2026-09-17): the router itself moves to OLLAMA_CLOUD, and
// three of the four OLLAMA_CLOUD aliases were fixed because they named models
// that do not exist. Verified live: glm-4.7, minimax-m2.1 and qwen3.5 had no
// deployment at all, so those entries sat permanently unresolved and were
// skipped on every walk. What survived was Gemini at PRIMARY plus a single
// reachable last resort - a chain that read as cross-provider on the admin
// page and behaved as Gemini-only in production.
export const ROUTER_CHAIN_SEED_VERSION = 3;
/** Distinct from the deployment backfill's lock so the two never serialise on
 * each other. */
export const ROUTER_CHAIN_SEED_LOCK_ID = 740_040_002;

export const ROUTER_CONFIGURATION_GLOBAL_SCOPE = 'GLOBAL';

/**
 * The default chain, seeded once and editable from the admin page afterwards.
 *
 * Every `modelAlias` here is a BOOTSTRAP ALIAS, not a verified endpoint. No
 * entry carries a deploymentId: discovery matches the alias to a real
 * ModelDeployment and only then can the entry run. An unresolved entry is
 * skipped, never guessed at.
 *
 * That skipping is silent, which is the trap. Matching is exact after
 * normalization — no family or prefix fallback, on purpose, so that the admin
 * page never shows a chain different from the one running. The cost is that a
 * single stale name removes an entry from the walk with nothing to see: v2
 * shipped `glm-4.7`, `minimax-m2.1` and `qwen3.5` against a catalog holding
 * `glm-5.2`, `minimax-m2.5` and `qwen3.5:397b`, and three of the four
 * cross-provider entries never ran once. Check a new alias against a real
 * ModelDeployment row before shipping it.
 *
 * The configuration is seeded DISABLED. Seeding a chain is not the same as
 * switching production onto it; enabling is an explicit admin action once the
 * entries have resolved and been health-checked.
 */
export const ROUTER_CHAIN_SEED_ENTRIES: readonly ChainSeedEntry[] = Object.freeze([
  {
    // The router runs on the Ollama Cloud connector, not on Gemini.
    //
    // Deciding WHICH model answers is a small, constant, every-request job, and
    // paying per token for it meant the cheapest possible question - "who should
    // answer this?" - carried a metered cost on every single turn. A
    // subscription connector makes that overhead flat.
    order: 1,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'glm-5.2',
    role: RouterChainEntryRole.PRIMARY,
    // Same reasoning as the Gemini timeout below: a real round trip for a short
    // JSON decision needs room, and an over-tight budget aborts a call that
    // would have succeeded.
    attemptTimeoutMs: 4_000,
    retries: 1,
    triggers: [],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    // Same provider on purpose: a model-specific fault should try a sibling
    // before abandoning the connector entirely. A provider-wide failure skips it.
    order: 2,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'kimi-k2.6',
    role: RouterChainEntryRole.MODEL_FALLBACK,
    attemptTimeoutMs: 4_000,
    retries: 0,
    triggers: [
      RouterErrorCode.MODEL_NOT_FOUND,
      RouterErrorCode.MODEL_RETIRED,
      RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT,
    ],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    // First cross-provider hop: survives an Ollama-Cloud-wide outage. Gemini
    // keeps its place in the chain, just not the first one.
    order: 3,
    provider: RouterProvider.GEMINI,
    modelAlias: 'gemini-3.5-flash-lite',
    // Real-world measurement (2026-08-16 live UAT): a genuine round trip to
    // Gemini's OpenAI-compatible endpoint for a short JSON routing decision
    // reliably exceeds 1.6s once TLS/routing/model-load latency is accounted
    // for, not just under adverse conditions - the original 1_600 value
    // aborted two consecutive real calls in testing, timing out the entire
    // chain on every request. 4_000 gives a real call realistic margin
    // without letting one slow attempt consume the whole walk.
    role: RouterChainEntryRole.PROVIDER_FALLBACK,
    attemptTimeoutMs: 4_000,
    retries: 0,
    triggers: [
      RouterErrorCode.TIMEOUT,
      RouterErrorCode.RATE_LIMITED,
      RouterErrorCode.PROVIDER_5XX,
      RouterErrorCode.NETWORK,
    ],
    billingModel: BillingModel.TOKEN,
  },
  {
    order: 4,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'minimax-m2.5',
    role: RouterChainEntryRole.PROVIDER_MODEL_FALLBACK,
    attemptTimeoutMs: 4_500,
    retries: 0,
    triggers: [RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT, RouterErrorCode.LOW_CONFIDENCE],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    order: 5,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'gpt-oss:120b',
    role: RouterChainEntryRole.LAST_RESORT,
    attemptTimeoutMs: 5_500,
    retries: 0,
    triggers: [],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    // Quality escalation is NOT an ordinary cheap fallback: it exists for a
    // decision that succeeded but is under the confidence floor, which is a
    // different condition from any provider failure. It stays on Gemini
    // deliberately - escalating to a second opinion from the SAME provider that
    // just returned a weak answer is not a second opinion.
    order: 6,
    provider: RouterProvider.GEMINI,
    modelAlias: 'gemini-3.6-flash',
    role: RouterChainEntryRole.QUALITY_ESCALATION,
    attemptTimeoutMs: 4_000,
    retries: 0,
    triggers: [RouterErrorCode.LOW_CONFIDENCE],
    billingModel: BillingModel.TOKEN,
  },
]);

export const ROUTER_CHAIN_SEED_CONFIGURATION: RouterConfigurationSeed = Object.freeze({
  scope: ROUTER_CONFIGURATION_GLOBAL_SCOPE,
  revision: 1,
  mode: RouterConfigurationMode.CLOUD_FIRST,
  // Seeded off. A chain existing is not the same as production using it.
  enabled: false,
  // Bumped alongside the per-entry timeouts above (2026-08-16 live UAT) - the
  // old 5_000 total was already smaller than the sum of just the first two
  // entries' old per-entry budgets, let alone enough for a real fallback hop
  // across providers.
  totalDeadlineMs: 15_000,
  maxAttempts: 6,
  maxRouterInputTokens: 1_800,
  maxRouterOutputTokens: 320,
  minConfidence: 0.75,
  lowConfidenceAction: LowConfidenceAction.QUALITY_ESCALATION_THEN_DETERMINISTIC,
  failClosedWhenNoEligibleRouter: true,
  skipProviderOnProviderWideFailure: true,
  safeTraceLevel: 'DETAILED_FACTORS',
  legacyLocalRollbackEnabled: true,
});
