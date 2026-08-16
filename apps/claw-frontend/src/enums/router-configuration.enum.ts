// Mirrors apps/claw-routing-service/prisma/schema.prisma. Kept as frontend
// enums rather than string-literal unions per rules/12 — these are domain
// values, not display strings. Imported directly by path (not re-exported
// from ./index.ts), matching the sibling router-models.enum.ts convention.

export enum RouterProvider {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GEMINI = 'GEMINI',
  DEEPSEEK = 'DEEPSEEK',
  GROK = 'GROK',
  AWS_BEDROCK = 'AWS_BEDROCK',
  OLLAMA = 'OLLAMA',
  OLLAMA_CLOUD = 'OLLAMA_CLOUD',
  LLAMACPP = 'LLAMACPP',
}

/** A revision is immutable once PUBLISHED. Editing produces a new revision. */
export enum RouterConfigurationStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  SUPERSEDED = 'SUPERSEDED',
}

export enum RouterConfigurationMode {
  CLOUD_FIRST = 'CLOUD_FIRST',
  HYBRID = 'HYBRID',
  PRIVATE_CLOUD = 'PRIVATE_CLOUD',
  LOCAL_ONLY = 'LOCAL_ONLY',
}

/** What a chain entry is for — documentation for operators, not branched on. */
export enum RouterChainEntryRole {
  PRIMARY = 'PRIMARY',
  MODEL_FALLBACK = 'MODEL_FALLBACK',
  PROVIDER_FALLBACK = 'PROVIDER_FALLBACK',
  PROVIDER_MODEL_FALLBACK = 'PROVIDER_MODEL_FALLBACK',
  LAST_RESORT = 'LAST_RESORT',
  QUALITY_ESCALATION = 'QUALITY_ESCALATION',
}

/** What happens when a decision is valid but under the confidence floor. */
export enum LowConfidenceAction {
  QUALITY_ESCALATION_THEN_DETERMINISTIC = 'QUALITY_ESCALATION_THEN_DETERMINISTIC',
  DETERMINISTIC_ONLY = 'DETERMINISTIC_ONLY',
  FAIL_CLOSED = 'FAIL_CLOSED',
}

export enum RouterConfigurationBillingModel {
  TOKEN = 'TOKEN',
  REQUEST = 'REQUEST',
  SUBSCRIPTION = 'SUBSCRIPTION',
  USAGE_LIMIT = 'USAGE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}
