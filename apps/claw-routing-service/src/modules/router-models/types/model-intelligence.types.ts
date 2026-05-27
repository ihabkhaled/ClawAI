/// Phase 3: Model Intelligence enrichment shape — the rich, planner-facing
/// view of every model the router knows. Mirrors §6.1 of the flagship prompt
/// (see plan-prompts/ClawAI_semantic_router_thread_context_flagship_pack/).
///
/// All capability flags are NULLABLE: NULL = unknown (do not assume; do not
/// select for high-risk), TRUE = known supported, FALSE = known unsupported.
/// The Phase 4 AI Route Planner treats null capabilities conservatively.

export type ModelIntelligenceCapabilityFlags = {
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
};

export type ModelIntelligenceDomainHints = {
  domainStrengths: string[];
  roleStrengths: string[];
  weakDomains: string[];
  bestFor: string[];
  avoidFor: string[];
  languageStrengths: string[];
};

export type ModelIntelligenceEconomics = {
  qualityTierLabel: string | null;
  costClassLabel: string | null;
  costConfidenceLabel: string | null;
  estimatedInputCostPer1M: number | null;
  estimatedOutputCostPer1M: number | null;
  latencyClassLabel: string | null;
  privacyClassLabel: string | null;
};

/// Full enrichment block written by `ModelIntelligenceService` /
/// `RouterSyncManager`. Every field is optional so partial updates from sync
/// sources can be merged without overwriting unrelated columns.
export type ModelIntelligenceEnrichment = Partial<
  ModelIntelligenceCapabilityFlags &
    ModelIntelligenceDomainHints &
    ModelIntelligenceEconomics
> & {
  maxContextTokens?: number | null;
  maxOutputTokensIntel?: number | null;
};

/// Curated static intelligence record for a well-known cloud model. Used
/// when the upstream connector-service doesn't yet expose rich metadata.
export type CuratedCloudModelIntelligence = {
  provider: string;
  modelKey: string;
  displayName: string;
  family?: string;
  enrichment: ModelIntelligenceEnrichment;
};

/// Result type from `ModelIntelligenceService.getIntelligence()`. Includes
/// the merged view (override on top of sync) PLUS the raw override block so
/// admins can see exactly what was pinned.
export type ResolvedModelIntelligence = ModelIntelligenceEnrichment & {
  provider: string;
  modelKey: string;
  displayName: string;
  lastEnrichedAt: Date | null;
  adminOverrideJson: Record<string, unknown> | null;
};
