import type { ConnectorModelExposure } from '../enums/connector-model-exposure.enum';
import type { ConnectorModelKind } from '../enums/connector-model-kind.enum';
// model-exposure.types.ts
// Only exported types — no logic, no runtime code.

/**
 * exposure is the admin decision about what ClawAI offers, distinct from
 * lifecycle which is what the provider says about the model.
 */
export interface ConnectorModelRow {
  id: string;
  connectorId: string;
  provider: string;
  modelKey: string;
  displayName: string;
  // Connector lifecycle, not the public catalogue's ModelLifecycle enum. Kept as
  // a plain string because it is display-only here and the two vocabularies must
  // not be confused.
  lifecycle: string;
  exposure: ConnectorModelExposure;
  kind: ConnectorModelKind;
  // Int? and DateTime? in Prisma — a model whose provider never reported a
  // context window, or that has not been seen since the column was added, has
  // no value here rather than a zero.
  maxContextTokens: number | null;
  usageTier: string;
  syncedAt: string;
  lastSeenAt: string | null;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
}

export interface SetModelExposureRequest {
  modelKeys: string[];
  exposed: boolean;
}

export interface SetModelExposureResponse {
  updated: number;
  previouslyExposed: string[];
}

export interface ModelExposureFilters {
  search: string;
  provider: string | null;
  exposedOnly: boolean | null;
  kind: ConnectorModelKind | null;
}
