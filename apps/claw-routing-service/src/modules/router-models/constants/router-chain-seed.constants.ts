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
export const ROUTER_CHAIN_SEED_VERSION = 1;
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
    attemptTimeoutMs: 1_600,
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
    attemptTimeoutMs: 1_500,
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
    attemptTimeoutMs: 1_800,
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
    attemptTimeoutMs: 1_800,
    retries: 0,
    triggers: [RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT, RouterErrorCode.LOW_CONFIDENCE],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    order: 5,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'qwen3.5:cloud',
    role: RouterChainEntryRole.PROVIDER_MODEL_FALLBACK,
    attemptTimeoutMs: 2_000,
    retries: 0,
    triggers: [RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT, RouterErrorCode.LOW_CONFIDENCE],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    order: 6,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'gpt-oss:120b-cloud',
    role: RouterChainEntryRole.LAST_RESORT,
    attemptTimeoutMs: 2_500,
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
    attemptTimeoutMs: 2_200,
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
  totalDeadlineMs: 5_000,
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
