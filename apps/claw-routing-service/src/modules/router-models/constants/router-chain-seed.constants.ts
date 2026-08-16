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
export const ROUTER_CHAIN_SEED_VERSION = 2;
/** Distinct from the deployment backfill's lock so the two never serialise on
 * each other. */
export const ROUTER_CHAIN_SEED_LOCK_ID = 740_040_002;

export const ROUTER_CONFIGURATION_GLOBAL_SCOPE = 'GLOBAL';

/**
 * The default chain, seeded once and editable from the admin page afterwards.
 *
 * Every `modelAlias` here is a BOOTSTRAP ALIAS, not a verified endpoint. Model
 * ids retire and get renamed constantly, and at least one of the pack's
 * suggestions already looks behind what this repo believes — routing.constants
 * carries glm-5.2 and kimi-k2.6 while the pack proposes glm-4.7. So no entry
 * carries a deploymentId: discovery matches the alias to a real ModelDeployment
 * and only then can the entry run. An unresolved entry is skipped, never
 * guessed at.
 *
 * The configuration is seeded DISABLED. Seeding a chain is not the same as
 * switching production onto it; enabling is an explicit admin action once the
 * entries have resolved and been health-checked.
 */
export const ROUTER_CHAIN_SEED_ENTRIES: readonly ChainSeedEntry[] = Object.freeze([
  {
    order: 1,
    provider: RouterProvider.GEMINI,
    modelAlias: 'gemini-3.5-flash-lite',
    role: RouterChainEntryRole.PRIMARY,
    // Real-world measurement (2026-08-16 live UAT): a genuine round trip to
    // Gemini's OpenAI-compatible endpoint for a short JSON routing decision
    // reliably exceeds 1.6s once TLS/routing/model-load latency is accounted
    // for, not just under adverse conditions - the original 1_600 value
    // aborted two consecutive real calls in testing, timing out the entire
    // chain on every request. 4_000 gives a real call realistic margin
    // without letting one slow attempt consume the whole walk.
    attemptTimeoutMs: 4_000,
    retries: 1,
    triggers: [],
    billingModel: BillingModel.TOKEN,
  },
  {
    // Same provider on purpose: a model-specific fault should try a sibling
    // before abandoning Google entirely. A provider-wide failure skips it.
    order: 2,
    provider: RouterProvider.GEMINI,
    modelAlias: 'gemini-2.5-flash-lite',
    role: RouterChainEntryRole.MODEL_FALLBACK,
    attemptTimeoutMs: 3_500,
    retries: 0,
    triggers: [
      RouterErrorCode.MODEL_NOT_FOUND,
      RouterErrorCode.MODEL_RETIRED,
      RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT,
    ],
    billingModel: BillingModel.TOKEN,
  },
  {
    // First cross-provider hop: survives a Google-wide outage.
    order: 3,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'glm-4.7:cloud',
    role: RouterChainEntryRole.PROVIDER_FALLBACK,
    attemptTimeoutMs: 4_500,
    retries: 0,
    triggers: [
      RouterErrorCode.TIMEOUT,
      RouterErrorCode.RATE_LIMITED,
      RouterErrorCode.PROVIDER_5XX,
      RouterErrorCode.NETWORK,
    ],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    order: 4,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'minimax-m2.1:cloud',
    role: RouterChainEntryRole.PROVIDER_MODEL_FALLBACK,
    attemptTimeoutMs: 4_500,
    retries: 0,
    triggers: [RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT, RouterErrorCode.LOW_CONFIDENCE],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    order: 5,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'qwen3.5:cloud',
    role: RouterChainEntryRole.PROVIDER_MODEL_FALLBACK,
    attemptTimeoutMs: 5_000,
    retries: 0,
    triggers: [RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT, RouterErrorCode.LOW_CONFIDENCE],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    order: 6,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'gpt-oss:120b-cloud',
    role: RouterChainEntryRole.LAST_RESORT,
    attemptTimeoutMs: 5_500,
    retries: 0,
    triggers: [],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    // Quality escalation is NOT an ordinary cheap fallback: it exists for a
    // decision that succeeded but is under the confidence floor, which is a
    // different condition from any provider failure.
    order: 7,
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
