import { z } from 'zod';

import {
  LLAMACPP_CONNECTOR_PROVIDER,
  LLAMACPP_PROVIDER,
  OLLAMA_CONNECTOR_PROVIDER,
  OLLAMA_PROVIDER,
} from '../../../common/constants/execution.constants';

/**
 * connector-service's catalog snapshot — the per-model media source of truth
 * (ADR-120). The same endpoint routing-service syncs from and file-service's
 * TranscriptionCapabilityClient reads.
 */
export const MODELS_SNAPSHOT_PATH = '/api/v1/internal/connectors/models-snapshot';

/** A capability flag changes only on a connector resync, so a minute is plenty. */
export const MODEL_CAPABILITY_CACHE_TTL_MS = 60_000;

/**
 * A failed fetch is remembered briefly, so a connector-service outage costs one
 * timeout per window rather than one per turn — and still recovers quickly.
 */
export const MODEL_CAPABILITY_FAILURE_TTL_MS = 10_000;

/**
 * Short on purpose: this sits on the send path, and an unknown capability
 * degrades to the provider-level fallback rather than failing the turn.
 */
export const MODEL_CAPABILITY_TIMEOUT_MS = 2_500;

/** `modalitiesIn` spellings the snapshot emits (connector `models-snapshot.manager.ts`). */
export const SNAPSHOT_IMAGE_INPUT_MODALITY = 'IMAGE_INPUT';
export const SNAPSHOT_VIDEO_INPUT_MODALITY = 'VIDEO_INPUT';
/** `AUDIO` from connector-service; `AUDIO_INPUT` is routing's spelling of the same flag. */
export const SNAPSHOT_AUDIO_MODALITIES: ReadonlySet<string> = new Set(['AUDIO', 'AUDIO_INPUT']);

/** Only models a user may actually pick are offered as alternatives. */
export const SNAPSHOT_EXPOSED_VALUE = 'EXPOSED';
export const SNAPSHOT_CHAT_KIND = 'CHAT';

/**
 * Local runtimes chat-service can classify by model name when the catalog
 * has no row for them — the same `isLocalVisionModel` heuristic the connector's
 * Ollama adapter applies when it does write a row.
 */
export const LOCAL_CAPABILITY_HEURISTIC_PROVIDERS: ReadonlySet<string> = new Set([
  OLLAMA_PROVIDER,
  OLLAMA_CONNECTOR_PROVIDER,
  LLAMACPP_PROVIDER,
  LLAMACPP_CONNECTOR_PROVIDER,
]);

/** A local model id that has not been resolved yet names no model to classify. */
export const UNRESOLVED_LOCAL_MODEL_IDS: ReadonlySet<string> = new Set(['', 'auto']);

export const modelsSnapshotResponseSchema = z.object({
  models: z.array(
    z.object({
      provider: z.string(),
      modelKey: z.string(),
      modalitiesIn: z.array(z.string()).optional(),
      exposure: z.string().optional(),
      kind: z.string().optional(),
    }),
  ),
});
