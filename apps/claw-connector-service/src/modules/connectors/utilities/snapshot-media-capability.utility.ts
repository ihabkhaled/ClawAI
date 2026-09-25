import { ConnectorProvider } from '../../../generated/prisma';
import { isGeminiAudioCapableModel } from '../constants/gemini-audio-heuristics.constants';
import { isGeminiVideoCapableModel } from '../constants/gemini-video-heuristics.constants';
import { type SnapshotMediaRow } from '../types/media-capability.types';

/**
 * The media flags a row may ADVERTISE, which can be narrower than what it
 * stores.
 *
 * GEMINI rows get their audio/video flags from a name heuristic at sync time
 * (`gemini-audio-heuristics.constants.ts`), and there is no scheduled sync:
 * a row keeps whatever the last admin-triggered sync wrote. Prod 2026-09-25
 * still carried the pre-heuristic blanket `supports_audio = true` on all 63
 * GEMINI rows, three days after the fail-closed heuristic shipped, and
 * transcription kept picking `models/antigravity-preview-05-2026`.
 *
 * Re-applying the same heuristic on read makes the deployed rule the truth
 * whatever the row's age. It only ever NARROWS: a stored `false` stays false.
 */
export function snapshotSupportsAudio(row: SnapshotMediaRow): boolean {
  if (!row.supportsAudio) {
    return false;
  }
  return row.provider === ConnectorProvider.GEMINI ? isGeminiAudioCapableModel(row.modelKey) : true;
}

/** Same narrowing for native video input. */
export function snapshotSupportsVideoInput(row: SnapshotMediaRow): boolean {
  if (!row.supportsVideoInput) {
    return false;
  }
  return row.provider === ConnectorProvider.GEMINI ? isGeminiVideoCapableModel(row.modelKey) : true;
}
