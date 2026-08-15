import type {
  BillingModel,
  LowConfidenceAction,
  RouterChainEntryRole,
  RouterConfigurationMode,
  RouterConfigurationStatus,
  RouterProvider,
} from '../../../generated/prisma';

/** One chain entry as stored, for admin editing. Unlike the routing-engine's
 * resolved snapshot, this is the raw row: no deployment-state resolution, no
 * eligibility filtering — the admin needs to see and edit exactly what is
 * persisted. */
export interface RouterConfigurationEntryRecord {
  id: string;
  order: number;
  enabled: boolean;
  role: RouterChainEntryRole;
  deploymentId: string | null;
  modelAlias: string;
  provider: RouterProvider;
  attemptTimeoutMs: number;
  retries: number;
  triggers: readonly string[];
  skipWhenProviderCircuitOpen: boolean;
  minConfidence: number | null;
  /** Serialized to a decimal string: BigInt does not survive JSON responses. */
  maxCostMicroUsd: string | null;
  billingModel: BillingModel;
  lastValidatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A configuration revision without its entries — the list view. */
export interface RouterConfigurationSummary {
  id: string;
  scope: string;
  revision: number;
  status: RouterConfigurationStatus;
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
  supersedesRevision: number | null;
  publishedAt: Date | null;
  publishedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  entryCount: number;
}

/** A configuration revision with its ordered chain entries — the detail view. */
export interface RouterConfigurationDetail extends Omit<RouterConfigurationSummary, 'entryCount'> {
  entries: readonly RouterConfigurationEntryRecord[];
}

/** Input for one chain entry inside a declarative entries-replace PATCH. The
 * PATCH takes the full desired list every time — no entry identity is
 * threaded through an edit — so "add" is appending to the array, "remove" is
 * omitting an entry, and "reorder" is changing array order. Array position
 * (1-based) becomes the entry's `order` — the only ordering column the schema
 * has, reused rather than duplicated. */
export interface ChainEntryInput {
  role: RouterChainEntryRole;
  provider: RouterProvider;
  modelAlias: string;
  deploymentId?: string;
  enabled: boolean;
  attemptTimeoutMs: number;
  retries: number;
  triggers: readonly string[];
  skipWhenProviderCircuitOpen: boolean;
  minConfidence?: number;
  maxCostMicroUsd?: number;
  billingModel: BillingModel;
}
