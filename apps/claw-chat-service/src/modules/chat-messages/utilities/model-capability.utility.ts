import { bareModelKey, modelMatchKey } from '@claw/shared-utilities';

import { MediaCapabilityState } from '../../../common/enums/media-capability-state.enum';
import {
  LOCAL_CAPABILITY_HEURISTIC_PROVIDERS,
  SNAPSHOT_AUDIO_MODALITIES,
  SNAPSHOT_CHAT_KIND,
  SNAPSHOT_EXPOSED_VALUE,
  SNAPSHOT_IMAGE_INPUT_MODALITY,
  SNAPSHOT_VIDEO_INPUT_MODALITY,
  UNRESOLVED_LOCAL_MODEL_IDS,
} from '../constants/model-capability.constants';
import { isLocalVisionModel } from '../constants/local-vision-heuristics.constants';
import type {
  MediaCapableModel,
  ModelMediaCapabilities,
  ModelsSnapshotEntry,
  ModelsSnapshotIndex,
} from '../types/model-capability.types';

/** Keys the snapshot with the one shared normalizer (`models/`, `:cloud`, case). */
export function indexModelsSnapshot(entries: readonly ModelsSnapshotEntry[]): ModelsSnapshotIndex {
  const index = new Map<string, ModelsSnapshotEntry>();
  for (const entry of entries) {
    index.set(modelMatchKey(entry.provider, entry.modelKey), entry);
  }
  return index;
}

/** The catalog's output ceiling for (provider, model); undefined = unknown (ADR-125). */
export function snapshotMaxOutputTokens(
  index: ModelsSnapshotIndex | null,
  provider: string,
  model: string,
): number | undefined {
  const value = index?.get(modelMatchKey(provider, model))?.maxOutputTokens;
  return typeof value === 'number' && value > 0 ? value : undefined;
}

/**
 * What (provider, model) can take natively.
 *
 * Unknown-capability policy (ADR-120):
 *  - A snapshot row is the answer, SUPPORTED or UNSUPPORTED per modality.
 *  - A LOCAL runtime with no row (or no snapshot) is classified by the same
 *    name heuristic the connector's Ollama adapter uses; no local runtime
 *    accepts native audio or video.
 *  - A cloud model with no row, or any model while the snapshot is down, is
 *    UNKNOWN — and the caller falls back to the provider-level behaviour that
 *    shipped before this existed, so an outage never regresses a working flow.
 */
export function resolveModelMediaCapabilities(
  index: ModelsSnapshotIndex | null,
  provider: string,
  model: string,
): ModelMediaCapabilities {
  const entry = index?.get(modelMatchKey(provider, model));
  if (entry !== undefined) {
    const modalities = entry.modalitiesIn ?? [];
    return {
      vision: stateOf(modalities.includes(SNAPSHOT_IMAGE_INPUT_MODALITY)),
      audioInput: stateOf(modalities.some((value) => SNAPSHOT_AUDIO_MODALITIES.has(value))),
      videoInput: stateOf(modalities.includes(SNAPSHOT_VIDEO_INPUT_MODALITY)),
    };
  }
  return LOCAL_CAPABILITY_HEURISTIC_PROVIDERS.has(provider)
    ? resolveLocalCapabilities(model)
    : unknownCapabilities();
}

/** Every capability UNKNOWN — the documented fallback shape. */
export function unknownCapabilities(): ModelMediaCapabilities {
  return {
    vision: MediaCapabilityState.UNKNOWN,
    audioInput: MediaCapabilityState.UNKNOWN,
    videoInput: MediaCapabilityState.UNKNOWN,
  };
}

/**
 * Exposed chat models that accept native video, in the catalog's own id
 * shape — what a video rejection may recommend. Built from the same data the
 * rejection consulted, so the two can never disagree (rule 42 item 13).
 */
export function listVideoCapableModels(index: ModelsSnapshotIndex): MediaCapableModel[] {
  const models: MediaCapableModel[] = [];
  for (const entry of index.values()) {
    const exposed = entry.exposure === undefined || entry.exposure === SNAPSHOT_EXPOSED_VALUE;
    const chat = entry.kind === undefined || entry.kind === SNAPSHOT_CHAT_KIND;
    if (exposed && chat && (entry.modalitiesIn ?? []).includes(SNAPSHOT_VIDEO_INPUT_MODALITY)) {
      models.push({ provider: entry.provider, model: bareModelKey(entry.modelKey) });
    }
  }
  return models;
}

function resolveLocalCapabilities(model: string): ModelMediaCapabilities {
  const bare = bareModelKey(model);
  return {
    vision: UNRESOLVED_LOCAL_MODEL_IDS.has(bare)
      ? MediaCapabilityState.UNKNOWN
      : stateOf(isLocalVisionModel(bare)),
    audioInput: MediaCapabilityState.UNSUPPORTED,
    videoInput: MediaCapabilityState.UNSUPPORTED,
  };
}

function stateOf(supported: boolean): MediaCapabilityState {
  return supported ? MediaCapabilityState.SUPPORTED : MediaCapabilityState.UNSUPPORTED;
}
