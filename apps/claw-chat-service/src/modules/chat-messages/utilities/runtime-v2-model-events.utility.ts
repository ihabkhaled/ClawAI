import {
  RUNTIME_V2_EMPTY_SUMMARY,
  RUNTIME_V2_MODEL_SUMMARY_CHARACTERS,
  RUNTIME_V2_MODEL_TURN_BYTES,
  RUNTIME_V2_TRUNCATION_NOTICE,
} from '../constants/runtime-v2-model-events.constants';
import type { RuntimeV2ModelEventDraft } from '../types/runtime-v2-model-events.types';

/**
 * Builds the journal events that carry one model turn's output.
 *
 * The order is the order a client projects them: the turn opens, the text
 * arrives, the turn closes. A turn that is never summarised stays open in the
 * client's projection, which is why an empty answer still gets a summary.
 */
export function buildRuntimeV2ModelEvents(
  turnId: string,
  text: string,
): RuntimeV2ModelEventDraft[] {
  const deliverable = clampToTurnBytes(text);
  return [
    { type: 'model.turn.started', payload: { turnId } },
    ...(deliverable === ''
      ? []
      : [{ type: 'model.delta' as const, payload: { turnId, text: deliverable } }]),
    { type: 'model.summary', payload: { turnId, summary: buildSummary(text) } },
  ];
}

/**
 * Bounds a turn's whole answer to what a client will actually accept.
 *
 * The previous behaviour chunked a long answer across several deltas. That
 * looks right but is not deliverable: a client caps the turn's CUMULATIVE text
 * at the same 64 KiB it caps one delta at, so the second chunk always pushed
 * the total over and was rejected — the run died part-way through the answer
 * instead of showing a shorter one. Truncating with a visible notice keeps the
 * user's answer, and the notice is what tells them it was cut.
 *
 * The walk is per code point and counts UTF-8 bytes, so a multi-byte character
 * is never split across the boundary and a non-ASCII answer is measured the
 * same way the client measures it.
 */
function clampToTurnBytes(text: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(text).byteLength <= RUNTIME_V2_MODEL_TURN_BYTES) return text;

  const budget =
    RUNTIME_V2_MODEL_TURN_BYTES - encoder.encode(RUNTIME_V2_TRUNCATION_NOTICE).byteLength;
  let bytes = 0;
  let kept = '';
  for (const character of text) {
    const size = encoder.encode(character).byteLength;
    if (bytes + size > budget) break;
    bytes += size;
    kept += character;
  }
  return `${kept}${RUNTIME_V2_TRUNCATION_NOTICE}`;
}

/**
 * A short closing line, not the answer.
 *
 * The summary schema requires a non-empty trimmed string, so a turn with no
 * text still gets an explicit one rather than an empty value the client would
 * reject.
 */
function buildSummary(text: string): string {
  const firstLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (firstLine === undefined) return RUNTIME_V2_EMPTY_SUMMARY;
  return firstLine.length <= RUNTIME_V2_MODEL_SUMMARY_CHARACTERS
    ? firstLine
    : `${firstLine.slice(0, RUNTIME_V2_MODEL_SUMMARY_CHARACTERS - 1)}…`;
}
