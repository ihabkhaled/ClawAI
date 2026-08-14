import type {
  BillingModel,
  DeploymentActivationState,
  LowConfidenceAction,
  RouterChainEntryRole,
  RouterConfigurationMode,
  RouterProvider,
} from '../../../generated/prisma';

/**
 * One immutable snapshot of the router's configuration, loaded once per request.
 *
 * The pack's central invariant: a request decides against ONE frozen view of
 * config, chain and deployment health. Re-reading mid-walk would let an admin
 * publish between entry 2 and entry 3 and produce a decision that matches no
 * revision that ever existed.
 */
export interface RouterConfigurationSnapshot {
  configurationId: string;
  scope: string;
  revision: number;
  mode: RouterConfigurationMode;
  enabled: boolean;
  totalDeadlineMs: number;
  maxAttempts: number;
  minConfidence: number;
  lowConfidenceAction: LowConfidenceAction;
  failClosedWhenNoEligibleRouter: boolean;
  skipProviderOnProviderWideFailure: boolean;
  legacyLocalRollbackEnabled: boolean;
  entries: readonly SnapshotChainEntry[];
}

/** A chain entry as stored, before eligibility is decided. */
export interface SnapshotChainEntry {
  entryId: string;
  order: number;
  enabled: boolean;
  role: RouterChainEntryRole;
  provider: RouterProvider;
  modelAlias: string;
  deploymentId: string | null;
  deploymentActivationState: DeploymentActivationState | null;
  deploymentProviderModelId: string | null;
  attemptTimeoutMs: number;
  retries: number;
  triggers: readonly string[];
  billingModel: BillingModel;
}

/** Why an entry cannot run. Safe to surface on a trace event. */
export type ChainEntryExclusionReason =
  | 'ENTRY_DISABLED'
  | 'DEPLOYMENT_UNRESOLVED'
  | 'DEPLOYMENT_NOT_ACTIVE'
  | 'NO_ADAPTER_FOR_PROVIDER'
  | 'ESCALATION_ONLY';

export interface ExcludedChainEntry {
  entryId: string;
  order: number;
  provider: RouterProvider;
  modelAlias: string;
  reason: ChainEntryExclusionReason;
}

export interface ChainResolution {
  /** Entries the coordinator may walk, in order. */
  runnable: readonly ResolvedChainEntry[];
  /** Entries that cannot run, each with a safe reason. */
  excluded: readonly ExcludedChainEntry[];
}

/** A chain entry proven runnable: enabled, resolved, active, adapter present. */
export interface ResolvedChainEntry {
  entryId: string;
  order: number;
  provider: RouterProvider;
  providerModelId: string;
  deploymentId: string;
  attemptTimeoutMs: number;
  retries: number;
  /**
   * Canonical RouterErrorCode names that route TO this entry. Empty means the
   * entry is reachable by ordinary chain order. Dropping this made every
   * trigger-gated entry reachable unconditionally.
   */
  triggers: readonly string[];
}
