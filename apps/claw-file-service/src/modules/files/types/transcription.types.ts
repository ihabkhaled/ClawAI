// B6b — audio transcription types.
//
// file-service must not import connector-service's own `connectors.types`
// (cross-service type coupling); these are the narrow read models of the two
// internal endpoints it actually consumes.

/** One row of `GET /api/v1/internal/connectors/models-snapshot`. */
export interface TranscriptionSnapshotEntry {
  provider: string;
  modelKey: string;
  /**
   * Built by connector-service's `ModelsSnapshotManager`; contains the string
   * `'AUDIO'` when the underlying row has `supportsAudio`.
   */
  modalitiesIn?: string[];
  /**
   * Not currently emitted by the snapshot, read defensively so the lookup keeps
   * working if the raw capability flag is ever surfaced directly.
   */
  supportsAudio?: boolean;
}

export interface TranscriptionSnapshotResponse {
  models: TranscriptionSnapshotEntry[];
}

/** `GET /api/v1/internal/connectors/config?provider=…`. */
export interface TranscriptionConnectorConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
}

/** The routing decision: which provider/model will be asked to transcribe. */
export interface TranscriptionCapability {
  provider: string;
  model: string;
}

/** A transcription adapter. Every provider implementation has this shape. */
export type TranscriptionAdapter = (
  baseUrl: string,
  apiKey: string,
  base64: string,
  mimeType: string,
  model: string,
) => Promise<string>;

// ---- Provider response read models ----
// The adapters live in `*.adapter.ts`, where ESLint forbids inline interface
// declarations, so the shapes they parse are owned here.

export interface GeminiPart {
  text?: string;
}

export interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}

export interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
}

export interface OpenAiTranscriptionResponse {
  text?: string;
}
