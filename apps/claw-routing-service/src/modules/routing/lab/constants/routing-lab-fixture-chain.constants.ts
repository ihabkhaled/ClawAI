import {
  BillingModel,
  DeploymentActivationState,
  LowConfidenceAction,
  RouterChainEntryRole,
  RouterConfigurationMode,
  RouterProvider,
} from '../../../../generated/prisma';
import type {
  RouterConfigurationSnapshot,
  SnapshotChainEntry,
} from '../../types/router-chain-resolution.types';
import {
  LAB_DEP_GEMINI_ESCALATION,
  LAB_DEP_GEMINI_FALLBACK,
  LAB_DEP_GEMINI_PRIMARY,
  LAB_DEP_OLLAMA_CLOUD_GLM,
  LAB_DEP_OLLAMA_CLOUD_GPTOSS,
  LAB_DEP_OLLAMA_CLOUD_MINIMAX,
  LAB_DEP_OLLAMA_CLOUD_QWEN,
} from './routing-lab-corpus-dimensions.constants';

/** Per-entry timeout used across the fixture chain, mirroring the real seed. */
export const ROUTING_LAB_ENTRY_ATTEMPT_TIMEOUT_MS = 1_600;
export const ROUTING_LAB_TOTAL_DEADLINE_MS = 5_000;
export const ROUTING_LAB_MAX_ATTEMPTS = 6;
export const ROUTING_LAB_MIN_CONFIDENCE = 0.75;

/**
 * The 7-entry chain shape from `docs/architecture/cloud-smart-router/EVIDENCE.md`,
 * but with every deployment resolved and ACTIVE — the real seed ships every
 * alias unresolved, which is correct for a fresh install and unusable for a
 * lab that needs the chain to actually walk.
 */
export const ROUTING_LAB_DEFAULT_ENTRIES: readonly SnapshotChainEntry[] = [
  {
    entryId: 'lab-entry-1',
    order: 1,
    enabled: true,
    role: RouterChainEntryRole.PRIMARY,
    provider: RouterProvider.GEMINI,
    modelAlias: 'gemini-3.5-flash-lite',
    deploymentId: LAB_DEP_GEMINI_PRIMARY,
    deploymentActivationState: DeploymentActivationState.ACTIVE,
    deploymentProviderModelId: 'gemini-2.5-flash',
    attemptTimeoutMs: ROUTING_LAB_ENTRY_ATTEMPT_TIMEOUT_MS,
    retries: 1,
    triggers: [],
    billingModel: BillingModel.TOKEN,
  },
  {
    entryId: 'lab-entry-2',
    order: 2,
    enabled: true,
    role: RouterChainEntryRole.MODEL_FALLBACK,
    provider: RouterProvider.GEMINI,
    modelAlias: 'gemini-2.5-flash-lite',
    deploymentId: LAB_DEP_GEMINI_FALLBACK,
    deploymentActivationState: DeploymentActivationState.ACTIVE,
    deploymentProviderModelId: 'gemini-2.5-flash-lite',
    attemptTimeoutMs: ROUTING_LAB_ENTRY_ATTEMPT_TIMEOUT_MS,
    retries: 1,
    triggers: [],
    billingModel: BillingModel.TOKEN,
  },
  {
    entryId: 'lab-entry-3',
    order: 3,
    enabled: true,
    role: RouterChainEntryRole.PROVIDER_FALLBACK,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'glm-4.7:cloud',
    deploymentId: LAB_DEP_OLLAMA_CLOUD_GLM,
    deploymentActivationState: DeploymentActivationState.ACTIVE,
    deploymentProviderModelId: 'glm-4.7:cloud',
    attemptTimeoutMs: ROUTING_LAB_ENTRY_ATTEMPT_TIMEOUT_MS,
    retries: 1,
    triggers: [],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    entryId: 'lab-entry-4',
    order: 4,
    enabled: true,
    role: RouterChainEntryRole.PROVIDER_MODEL_FALLBACK,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'minimax-m2.1:cloud',
    deploymentId: LAB_DEP_OLLAMA_CLOUD_MINIMAX,
    deploymentActivationState: DeploymentActivationState.ACTIVE,
    deploymentProviderModelId: 'minimax-m2.1:cloud',
    attemptTimeoutMs: ROUTING_LAB_ENTRY_ATTEMPT_TIMEOUT_MS,
    retries: 1,
    triggers: [],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    entryId: 'lab-entry-5',
    order: 5,
    enabled: true,
    role: RouterChainEntryRole.PROVIDER_MODEL_FALLBACK,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'qwen3.5:cloud',
    deploymentId: LAB_DEP_OLLAMA_CLOUD_QWEN,
    deploymentActivationState: DeploymentActivationState.ACTIVE,
    deploymentProviderModelId: 'qwen3.5:cloud',
    attemptTimeoutMs: ROUTING_LAB_ENTRY_ATTEMPT_TIMEOUT_MS,
    retries: 1,
    triggers: [],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    entryId: 'lab-entry-6',
    order: 6,
    enabled: true,
    role: RouterChainEntryRole.LAST_RESORT,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'gpt-oss:120b-cloud',
    deploymentId: LAB_DEP_OLLAMA_CLOUD_GPTOSS,
    deploymentActivationState: DeploymentActivationState.ACTIVE,
    deploymentProviderModelId: 'gpt-oss:120b-cloud',
    attemptTimeoutMs: ROUTING_LAB_ENTRY_ATTEMPT_TIMEOUT_MS,
    retries: 1,
    triggers: [],
    billingModel: BillingModel.SUBSCRIPTION,
  },
  {
    // Excluded from the ordinary walk by resolveChain (ESCALATION_ONLY) —
    // present so the fixture matches the real seed's shape and the lab can
    // assert it never appears in `runnable`.
    entryId: 'lab-entry-7',
    order: 7,
    enabled: true,
    role: RouterChainEntryRole.QUALITY_ESCALATION,
    provider: RouterProvider.GEMINI,
    modelAlias: 'gemini-3.6-flash',
    deploymentId: LAB_DEP_GEMINI_ESCALATION,
    deploymentActivationState: DeploymentActivationState.ACTIVE,
    deploymentProviderModelId: 'gemini-3.6-flash',
    attemptTimeoutMs: ROUTING_LAB_ENTRY_ATTEMPT_TIMEOUT_MS,
    retries: 0,
    triggers: [],
    billingModel: BillingModel.TOKEN,
  },
];

/**
 * A minimal, self-contained 2-entry chain for `TRIGGER_GATED_FALLBACK`.
 *
 * Deliberately NOT the 6-entry default chain plus one gated entry: with the
 * full chain, entries 3-6 all share the Ollama Cloud adapter and would
 * overwrite `state.lastCode` before a gated entry at order 8 is ever
 * reached, making the trigger condition depend on choreographing five
 * shared-adapter call indices instead of on the one thing this fixture
 * exists to prove — that a non-empty `triggers` list gates reachability.
 */
export const ROUTING_LAB_TRIGGER_GATED_ENTRIES: readonly SnapshotChainEntry[] = [
  {
    entryId: 'lab-gated-entry-1',
    order: 1,
    enabled: true,
    role: RouterChainEntryRole.PRIMARY,
    provider: RouterProvider.GEMINI,
    modelAlias: 'gemini-3.5-flash-lite',
    deploymentId: LAB_DEP_GEMINI_PRIMARY,
    deploymentActivationState: DeploymentActivationState.ACTIVE,
    deploymentProviderModelId: 'gemini-2.5-flash',
    attemptTimeoutMs: ROUTING_LAB_ENTRY_ATTEMPT_TIMEOUT_MS,
    retries: 0,
    triggers: [],
    billingModel: BillingModel.TOKEN,
  },
  {
    entryId: 'lab-gated-entry-2',
    order: 2,
    enabled: true,
    role: RouterChainEntryRole.PROVIDER_FALLBACK,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'gpt-oss:120b-cloud',
    deploymentId: LAB_DEP_OLLAMA_CLOUD_GPTOSS,
    deploymentActivationState: DeploymentActivationState.ACTIVE,
    deploymentProviderModelId: 'gpt-oss:120b-cloud',
    attemptTimeoutMs: ROUTING_LAB_ENTRY_ATTEMPT_TIMEOUT_MS,
    retries: 0,
    // Reachable only when entry 1's last failure was exactly this code.
    triggers: ['MALFORMED_STRUCTURED_OUTPUT'],
    billingModel: BillingModel.SUBSCRIPTION,
  },
];

export const ROUTING_LAB_TRIGGER_GATED_SNAPSHOT: RouterConfigurationSnapshot = {
  configurationId: 'lab-configuration-trigger-gated',
  scope: 'GLOBAL',
  revision: 1,
  mode: RouterConfigurationMode.CLOUD_FIRST,
  enabled: true,
  totalDeadlineMs: ROUTING_LAB_TOTAL_DEADLINE_MS,
  maxAttempts: ROUTING_LAB_MAX_ATTEMPTS,
  minConfidence: ROUTING_LAB_MIN_CONFIDENCE,
  lowConfidenceAction: LowConfidenceAction.QUALITY_ESCALATION_THEN_DETERMINISTIC,
  failClosedWhenNoEligibleRouter: true,
  skipProviderOnProviderWideFailure: true,
  legacyLocalRollbackEnabled: true,
  entries: ROUTING_LAB_TRIGGER_GATED_ENTRIES,
};

export const ROUTING_LAB_DEFAULT_SNAPSHOT: RouterConfigurationSnapshot = {
  configurationId: 'lab-configuration',
  scope: 'GLOBAL',
  revision: 1,
  mode: RouterConfigurationMode.CLOUD_FIRST,
  enabled: true,
  totalDeadlineMs: ROUTING_LAB_TOTAL_DEADLINE_MS,
  maxAttempts: ROUTING_LAB_MAX_ATTEMPTS,
  minConfidence: ROUTING_LAB_MIN_CONFIDENCE,
  lowConfidenceAction: LowConfidenceAction.QUALITY_ESCALATION_THEN_DETERMINISTIC,
  failClosedWhenNoEligibleRouter: true,
  skipProviderOnProviderWideFailure: true,
  legacyLocalRollbackEnabled: true,
  entries: ROUTING_LAB_DEFAULT_ENTRIES,
};
