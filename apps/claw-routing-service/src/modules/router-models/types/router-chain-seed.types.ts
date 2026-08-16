import type {
  BillingModel,
  LowConfidenceAction,
  RouterChainEntryRole,
  RouterConfigurationMode,
  RouterProvider,
} from '../../../generated/prisma';

/** One seeded chain entry, keyed by alias because no endpoint is verified yet. */
export interface ChainSeedEntry {
  order: number;
  provider: RouterProvider;
  modelAlias: string;
  role: RouterChainEntryRole;
  attemptTimeoutMs: number;
  retries: number;
  /** Canonical RouterErrorCode names that route to this entry. */
  triggers: readonly string[];
  billingModel: BillingModel;
}

export interface RouterConfigurationSeed {
  scope: string;
  revision: number;
  mode: RouterConfigurationMode;
  enabled: boolean;
  totalDeadlineMs: number;
  maxAttempts: number;
  maxRouterInputTokens: number;
  maxRouterOutputTokens: number;
  minConfidence: number;
  lowConfidenceAction: LowConfidenceAction;
  failClosedWhenNoEligibleRouter: boolean;
  skipProviderOnProviderWideFailure: boolean;
  safeTraceLevel: string;
  legacyLocalRollbackEnabled: boolean;
}

export interface ChainSeedInput {
  name: string;
  version: number;
  checksum: string;
  configuration: RouterConfigurationSeed;
  entries: readonly ChainSeedEntry[];
}
