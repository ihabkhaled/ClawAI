import {
  type CostClass,
  type CostConfidence,
  type DomainTag,
  type LatencyClass,
  type ModalityKind,
  type ModelLifecycle,
  type PrivacyClass,
  type QualityTier,
} from '../../../generated/prisma';

export type RouterModelRegistryRecord = {
  id: string;
  provider: string;
  modelKey: string;
  displayName: string;
  family: string | null;
  connectorId: string | null;
  runtimeId: string | null;
  isLocal: boolean;
  isRouterOnly: boolean;
  isExecutionCapable: boolean;
  lifecycle: ModelLifecycle;
  modalitiesIn: ModalityKind[];
  modalitiesOut: ModalityKind[];
  contextWindowTokens: number | null;
  maxOutputTokens: number | null;
  domainTags: DomainTag[];
  notRecommendedFor: DomainTag[];
  inputCostPer1M: string | null;
  outputCostPer1M: string | null;
  costConfidence: CostConfidence;
  costClass: CostClass | null;
  latencyP50Ms: number | null;
  latencyP95Ms: number | null;
  latencyClass: LatencyClass | null;
  qualityTier: QualityTier;
  hallucinationRisk: string | null;
  judgeSuitability: boolean;
  searchSuitability: boolean;
  fallbackSuitability: boolean;
  privacySupport: PrivacyClass;
  metadataSource: string;
  externalCardUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date | null;
  // Semantic Router Flagship — Phase 3: enrichment fields
  supportsStreaming: boolean | null;
  supportsTools: boolean | null;
  supportsStructuredOutput: boolean | null;
  supportsVision: boolean | null;
  supportsAudioInput: boolean | null;
  supportsAudioOutput: boolean | null;
  supportsVideoInput: boolean | null;
  supportsFileInput: boolean | null;
  supportsEmbeddings: boolean | null;
  supportsLongContext: boolean | null;
  maxContextTokens: number | null;
  maxOutputTokensIntel: number | null;
  domainStrengths: string[];
  roleStrengths: string[];
  weakDomains: string[];
  bestFor: string[];
  avoidFor: string[];
  languageStrengths: string[];
  qualityTierLabel: string | null;
  costClassLabel: string | null;
  costConfidenceLabel: string | null;
  estimatedInputCostPer1M: number | null;
  estimatedOutputCostPer1M: number | null;
  latencyClassLabel: string | null;
  privacyClassLabel: string | null;
  adminOverrideJson: Record<string, unknown> | null;
  lastEnrichedAt: Date | null;
};

export type RouterAdminOverrideRecord = {
  id: string;
  profileId: string;
  fieldName: string;
  fieldValue: unknown;
  reason: string | null;
  setBy: string;
  setAt: Date;
  isActive: boolean;
};

export type FindExecutionCandidatesFilter = {
  requiredModalitiesIn?: ModalityKind[];
  requiredModalitiesOut?: ModalityKind[];
  domain?: DomainTag;
  privacyClassMinimum?: PrivacyClass;
  excludeRouterOnly?: boolean;
  excludeProviders?: string[];
};
