import {
  type Connector,
  type ConnectorAuthType,
  type ConnectorProvider,
  type ConnectorStatus,
  type ModelLifecycle,
  type ModelSyncStatus,
  type ModelUsageTier,
} from '../../../generated/prisma';
import type { CapabilityConfidence, CapabilityEvidenceSource } from '@claw/shared-types';

export interface CreateConnectorData {
  name: string;
  provider: ConnectorProvider;
  authType: ConnectorAuthType;
  encryptedConfig?: string;
  baseUrl?: string;
  region?: string;
  workspaceId?: string;
  isPayAsYouGo?: boolean;
}

export interface UpdateConnectorData {
  name?: string;
  provider?: ConnectorProvider;
  authType?: ConnectorAuthType;
  encryptedConfig?: string;
  baseUrl?: string;
  region?: string;
  workspaceId?: string;
  isEnabled?: boolean;
  status?: ConnectorStatus;
  defaultModelId?: string;
  isPayAsYouGo?: boolean;
}

export interface ConnectorFilters {
  provider?: ConnectorProvider;
  status?: ConnectorStatus;
  isEnabled?: boolean;
  search?: string;
}

export interface ConnectorWithModels extends Connector {
  _count: { models: number };
}

export interface SyncModelsResult {
  modelsFound: number;
  modelsAdded: number;
  modelsRemoved: number;
}

export interface HealthCheckResult {
  status: ConnectorStatus;
  latencyMs: number;
  errorMessage?: string;
}

export interface NormalizedModel {
  modelKey: string;
  displayName: string;
  lifecycle: ModelLifecycle;
  capabilities: ModelCapabilities;
  usage?: ModelUsageMetadata;
}

export interface ModelUsageMetadata {
  tier: ModelUsageTier;
  inputUsdPerMillion: number | null;
  cachedInputUsdPerMillion: number | null;
  outputUsdPerMillion: number | null;
}

export interface CreateHealthEventData {
  connectorId: string;
  status: ConnectorStatus;
  latencyMs?: number;
  errorMessage?: string;
}

export interface CreateSyncRunData {
  connectorId: string;
  status: ModelSyncStatus;
  modelsFound?: number;
  modelsAdded?: number;
  modelsRemoved?: number;
  errorMessage?: string;
  completedAt?: Date;
}

export interface ModelCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsStructuredOutput: boolean;
  maxContextTokens?: number;
  /**
   * Provenance for `supportsTools`.
   *
   * The bare boolean cannot answer the question routing actually needs to ask,
   * which is not "does this model have tools" but "how do we know, and is that
   * good enough to stake an agent run on". A curated family list and a
   * successful behavioural probe both produce `true`, and routing must be able
   * to tell them apart — otherwise a run lands on a model that silently
   * ignores `tools` and then cannot explain why it did nothing.
   *
   * Optional so every existing adapter keeps compiling; absent means UNKNOWN.
   */
  toolEvidence?: ModelToolEvidence;
}

/** Minimal capability provenance carried alongside a normalized model. */
export interface ModelToolEvidence {
  source: CapabilityEvidenceSource;
  confidence: CapabilityConfidence;
  checkedAt: string;
  /** Short, safe explanation of how the claim was reached. Never a raw body. */
  rationale: string;
}

export interface ConnectorConfigResult {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  region?: string;
}

/** One connector's contribution to the provider-grain PAYG rollup. */
export interface ConnectorPaygPolicyRow {
  provider: string;
  isEnabled: boolean;
  isPayAsYouGo: boolean;
}

/**
 * The provider-grain PAYG policy auth-service reserves against.
 *
 * One entry per DISTINCT provider that has a connector row, `true` when any
 * enabled connector for that provider is PAYG. auth-service caches this for
 * PAYG_POLICY_CACHE_TTL_SECONDS, so a toggle takes effect within a minute.
 */
export interface ConnectorPaygPolicyResult {
  providers: Record<string, boolean>;
}

export interface ConnectorHealthSnapshotResult {
  connectors: Array<{
    provider: string;
    status: ConnectorStatus;
  }>;
  generatedAt: string;
}

export interface UpstreamModelSnapshotEntry {
  provider: string;
  modelKey: string;
  displayName: string;
  family?: string;
  isLocal?: boolean;
  modalitiesIn?: string[];
  modalitiesOut?: string[];
  contextWindowTokens?: number;
  maxOutputTokens?: number;
}

export interface ConnectorModelsSnapshotResult {
  models: UpstreamModelSnapshotEntry[];
  generatedAt: string;
}
