import { ModalityKind } from '../../../generated/prisma';

/**
 * Connector-service's models-snapshot speaks a shorter modality vocabulary
 * than routing's `ModalityKind`. `AUDIO` is read as-is by file-service's
 * transcription client, so the connector keeps emitting it; routing maps it
 * here. Before this map existed every audio-flagged model failed its upsert
 * ("failed to upsert") because `AUDIO` is not a `ModalityKind` member.
 */
export const SNAPSHOT_MODALITY_ALIASES: ReadonlyMap<string, ModalityKind> = new Map([
  ['AUDIO', ModalityKind.AUDIO_INPUT],
  ['VIDEO', ModalityKind.VIDEO_INPUT],
  ['IMAGE', ModalityKind.IMAGE_INPUT],
]);

/** Every `ModalityKind` member, for membership checks on untyped snapshot strings. */
export const KNOWN_MODALITY_KINDS: ReadonlySet<string> = new Set<string>(
  Object.values(ModalityKind),
);
