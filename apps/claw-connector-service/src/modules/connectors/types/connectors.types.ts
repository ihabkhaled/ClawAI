import {
  type Connector,
  type ConnectorAuthType,
  type ConnectorModel,
  type ConnectorModelEventType,
  type ConnectorProvider,
  type ConnectorStatus,
  type ModelExposure,
  type ModelKind,
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
  accountId?: string;
  providerDefinitionId?: string;
  isPayAsYouGo?: boolean;
  encryptedGatewayHeaders?: string;
}

export interface UpdateConnectorData {
  name?: string;
  authType?: ConnectorAuthType;
  encryptedConfig?: string;
  baseUrl?: string;
  region?: string;
  workspaceId?: string;
  accountId?: string;
  isEnabled?: boolean;
  status?: ConnectorStatus;
  defaultModelId?: string;
  isPayAsYouGo?: boolean;
  // `null` clears the column (F092).
  encryptedGatewayHeaders?: string | null;
}

export interface ConnectorFilters {
  provider?: ConnectorProvider;
  status?: ConnectorStatus;
  isEnabled?: boolean;
  search?: string;
}

export interface ConnectorWithModels extends Connector {
  _count: { models: number };
  providerDisplayName?: string;
}

export interface ConnectorWithProviderDefinition extends Connector {
  _count: { models: number };
  providerDefinition: { key: string; displayName: string } | null;
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
  /** Set only by adapters that can tell; absent keeps the stored kind (CHAT on create). */
  kind?: ModelKind;
  /** Why the adapter gave a non-CHAT `kind`, in admin words ("Google lists only: createDecision"). */
  kindReason?: string;
}

/** The kind-related columns one sync writes for one model. Empty for a chat model. */
export interface SyncKindFields {
  kind?: ModelKind;
  kindReason?: string;
  exposure?: 'UNEXPOSED';
}

/** A row's state before a sync, as far as the visibility trail needs it. */
export type SyncEventBaseline = Pick<
  ConnectorModel,
  'modelKey' | 'kind' | 'exposure' | 'lifecycle'
>;

export interface CreateModelEventData {
  connectorId: string;
  modelKey: string;
  type: ConnectorModelEventType;
  beforeKind?: ModelKind;
  afterKind?: ModelKind;
  beforeExposure?: ModelExposure;
  afterExposure?: ModelExposure;
  reason?: string;
}

/** One check the chat picker applies, in the order it applies them. */
export type ModelVisibilityGateName =
  | 'EXISTS'
  | 'CONNECTOR_ENABLED'
  | 'LIFECYCLE_ACTIVE'
  | 'EXPOSED'
  | 'KIND_CHAT'
  | 'IN_ROUTING_REGISTRY'
  | 'NOT_ROUTER_ONLY'
  | 'PRICED';

/** UNKNOWN: routing-service did not answer. SKIPPED: an earlier gate already failed. */
export type ModelVisibilityGateStatus = 'PASS' | 'FAIL' | 'UNKNOWN' | 'SKIPPED';

export interface ModelVisibilityGate {
  gate: ModelVisibilityGateName;
  status: ModelVisibilityGateStatus;
  detail: string;
}

/** routing-service's answer for one model (`GET internal/router-models/visibility`). */
export interface RoutingModelVisibility {
  inRegistry: boolean;
  lifecycle: string | null;
  isRouterOnly: boolean | null;
  costClass: string | null;
}

/** The connector row the diagnostic judged, plus its connector's switches. */
export type ModelVisibilityRow = Pick<
  ConnectorModel,
  | 'connectorId'
  | 'provider'
  | 'modelKey'
  | 'displayName'
  | 'kind'
  | 'kindReason'
  | 'exposure'
  | 'lifecycle'
> & {
  connector: {
    name: string;
    isEnabled: boolean;
    providerDefinition: { key: string; isActive: boolean } | null;
  };
};

export interface ModelVisibilityEvent {
  type: ConnectorModelEventType;
  beforeKind: ModelKind | null;
  afterKind: ModelKind | null;
  beforeExposure: ModelExposure | null;
  afterExposure: ModelExposure | null;
  reason: string | null;
  createdAt: Date;
}

/** `GET /connectors/model-visibility`: why a model is (not) in the chat picker. */
export interface ModelVisibilityReport {
  provider: string;
  modelKey: string;
  visibleInPicker: boolean;
  /** The first gate that did not pass, or null when every gate passed. */
  firstFailingGate: ModelVisibilityGateName | null;
  model: {
    connectorId: string;
    connectorName: string;
    displayName: string;
    kind: ModelKind;
    kindReason: string | null;
    exposure: ModelExposure;
    lifecycle: string;
  } | null;
  gates: ModelVisibilityGate[];
  recentEvents: ModelVisibilityEvent[];
}

/** An exposed model the picker still will not show, returned so the admin is told at once. */
export interface NotInPickerModel {
  modelKey: string;
  kind: ModelKind;
  kindReason: string | null;
}

export interface ModelUsageMetadata {
  tier: ModelUsageTier;
  // A decimal string is accepted so published prices never pass through a float.
  inputUsdPerMillion: number | string | null;
  cachedInputUsdPerMillion: number | string | null;
  outputUsdPerMillion: number | string | null;
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
  /** Connector can serve speech-to-text / audio input for this model. */
  supportsAudio: boolean;
  /** Model accepts native video input (not frames). Fails closed per adapter heuristic. */
  supportsVideoInput: boolean;
  supportsStructuredOutput: boolean;
  maxContextTokens?: number;
  /** Provider-published output ceiling (ADR-125); absent = unknown. */
  maxOutputTokens?: number;
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
  // F092: chat-service merges these under its own provider headers.
  gatewayHeaders?: Record<string, string>;
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
  providerDisplayName?: string;
  adapterFamily?: string;
  modelKey: string;
  displayName: string;
  family?: string;
  isLocal?: boolean;
  modalitiesIn?: string[];
  modalitiesOut?: string[];
  /** IMAGE, VIDEO or AUDIO when the model outputs media instead of text; absent for chat models. */
  mediaKind?: string;
  /** SPEECH or MUSIC when `mediaKind` is AUDIO. */
  audioKind?: string;
  contextWindowTokens?: number;
  maxOutputTokens?: number;
  /**
   * EXPOSED when an admin offers this model to users. routing-service builds
   * the AUTO router's candidates from these, so the router can pick any model
   * an admin exposed, not only the handful named in its own chain.
   */
  exposure?: string;
  /** CHAT, IMAGE, AUDIO... Only CHAT models can answer a chat turn. */
  kind?: string;
  /**
   * F093: an administrator asked for this model's prompt to be cached (Anthropic
   * `cache_control`). chat-service reads it from here; absent means off.
   */
  promptCaching?: boolean;
  /** Provider-published prices, integer micro-USD per million tokens; absent = unpublished. */
  inputCostPerMTokMicroUsd?: number;
  outputCostPerMTokMicroUsd?: number;
  cachedInputCostPerMTokMicroUsd?: number;
}

export interface SnapshotPriceFields {
  inputCostPerMTokMicroUsd?: number;
  outputCostPerMTokMicroUsd?: number;
  cachedInputCostPerMTokMicroUsd?: number;
}

/** The stored price columns of a ConnectorModel row. */
export interface PricedModelRow {
  inputUsdPerMillion: { toFixed(digits: number): string } | null;
  outputUsdPerMillion: { toFixed(digits: number): string } | null;
  cachedInputUsdPerMillion: { toFixed(digits: number): string } | null;
}

export interface ScheduledSyncSummary {
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: boolean;
}

export interface ConnectorModelsSnapshotResult {
  models: UpstreamModelSnapshotEntry[];
  generatedAt: string;
}

/**
 * One row of `GET /connectors/available-models`. `kind` stays as stored (CHAT, or AUDIO for
 * tts/music) for older clients; `modalitiesOut` and `mediaKind` type the media models.
 */
export type AvailableModelEntry = Omit<ConnectorModel, 'provider'> & {
  provider: string;
  modalitiesOut: string[];
  /** IMAGE, VIDEO or AUDIO for a media-generation model; absent for a chat model. */
  mediaKind?: string;
  /** SPEECH or MUSIC when `mediaKind` is AUDIO. */
  audioKind?: string;
};
