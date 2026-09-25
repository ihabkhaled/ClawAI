import {
  TRANSCRIPTION_AUDIO_MODALITY,
  TRANSCRIPTION_EXPOSED_EXPOSURE,
  TRANSCRIPTION_FIXED_MODEL_PROVIDERS,
  TRANSCRIPTION_MAX_CANDIDATES_PER_PROVIDER,
  TRANSCRIPTION_MODELS_PREFIX,
  TRANSCRIPTION_PREFERRED_MODEL_FAMILIES,
  TRANSCRIPTION_PROVIDER_PRIORITY,
  TRANSCRIPTION_UNSTABLE_MODEL_MARKERS,
} from '../constants/transcription.constants';
import {
  type TranscriptionCapability,
  type TranscriptionSnapshotEntry,
} from '../types/transcription.types';

function normalisedKey(modelKey: string): string {
  const lower = modelKey.toLowerCase();
  return lower.startsWith(TRANSCRIPTION_MODELS_PREFIX)
    ? lower.slice(TRANSCRIPTION_MODELS_PREFIX.length)
    : lower;
}

function claimsAudio(entry: TranscriptionSnapshotEntry): boolean {
  return entry.supportsAudio === true
    ? true
    : (entry.modalitiesIn ?? []).includes(TRANSCRIPTION_AUDIO_MODALITY);
}

/**
 * Whether a model key names a plain, generally-available model — not a
 * preview, not another product line that happens to share the catalog.
 * Name-based on purpose: the connector snapshot carries no release-stage field.
 */
export function isStableTranscriptionModel(modelKey: string): boolean {
  const key = normalisedKey(modelKey);
  return !TRANSCRIPTION_UNSTABLE_MODEL_MARKERS.some((marker) => key.includes(marker));
}

/** 0 = flash-lite, 1 = flash, 2 = anything else. Lower is tried first. */
function familyRank(modelKey: string): number {
  const key = normalisedKey(modelKey);
  const index = TRANSCRIPTION_PREFERRED_MODEL_FAMILIES.findIndex((family) => key.includes(family));
  return index === -1 ? TRANSCRIPTION_PREFERRED_MODEL_FAMILIES.length : index;
}

function exposureRank(entry: TranscriptionSnapshotEntry): number {
  return entry.exposure === TRANSCRIPTION_EXPOSED_EXPOSURE ? 0 : 1;
}

/**
 * Family, then exposure, then key. The key comparison is only the tie-break
 * that makes the order deterministic; ascending puts the longest-shipped
 * version (`2.5` before `3.1`) first, which is the conservative choice.
 */
function compareEntries(a: TranscriptionSnapshotEntry, b: TranscriptionSnapshotEntry): number {
  const byFamily = familyRank(a.modelKey) - familyRank(b.modelKey);
  if (byFamily !== 0) {
    return byFamily;
  }
  const byExposure = exposureRank(a) - exposureRank(b);
  return byExposure === 0 ? a.modelKey.localeCompare(b.modelKey) : byExposure;
}

function isFixedModelProvider(provider: string): boolean {
  return TRANSCRIPTION_FIXED_MODEL_PROVIDERS.includes(provider);
}

/** A fixed-model provider's row name is irrelevant: the call goes to its own model. */
function isStableEntry(entry: TranscriptionSnapshotEntry): boolean {
  return isFixedModelProvider(entry.provider) ? true : isStableTranscriptionModel(entry.modelKey);
}

function takeForProvider(
  provider: string,
  entries: readonly TranscriptionSnapshotEntry[],
): TranscriptionCapability[] {
  const own = entries.filter((entry) => entry.provider === provider);
  const chosen = isFixedModelProvider(provider)
    ? own.slice(0, 1)
    : own.sort(compareEntries).slice(0, TRANSCRIPTION_MAX_CANDIDATES_PER_PROVIDER);
  return chosen.map((entry) => ({ provider, model: entry.modelKey }));
}

/**
 * The ordered list the candidate walk tries: providers in
 * `TRANSCRIPTION_PROVIDER_PRIORITY` order, at most
 * `TRANSCRIPTION_MAX_CANDIDATES_PER_PROVIDER` models each, best model first.
 *
 * Unstable rows (preview, image, tts, …) are dropped whenever ANY stable
 * candidate exists anywhere, and used only as a last resort when nothing
 * stable is configured — a preview that might work beats a refusal that
 * certainly will.
 */
export function selectTranscriptionCandidates(
  entries: readonly TranscriptionSnapshotEntry[],
): TranscriptionCapability[] {
  const usable = entries.filter(
    (entry) => TRANSCRIPTION_PROVIDER_PRIORITY.includes(entry.provider) && claimsAudio(entry),
  );
  const stable = usable.filter((entry) => isStableEntry(entry));
  const pool = stable.length > 0 ? stable : usable;
  return TRANSCRIPTION_PROVIDER_PRIORITY.flatMap((provider) => takeForProvider(provider, pool));
}
