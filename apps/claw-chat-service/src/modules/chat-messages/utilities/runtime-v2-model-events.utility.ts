import {
  RUNTIME_V2_EMPTY_SUMMARY,
  RUNTIME_V2_MODEL_DELTA_CHARACTERS,
  RUNTIME_V2_MODEL_SUMMARY_CHARACTERS,
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
  const chunks = splitForDeltas(text);
  return [
    { type: 'model.turn.started', payload: { turnId } },
    ...chunks.map((chunk) => ({ type: 'model.delta' as const, payload: { turnId, text: chunk } })),
    { type: 'model.summary', payload: { turnId, summary: buildSummary(text) } },
  ];
}

/**
 * Splits on the delta cap.
 *
 * Clients bound CUMULATIVE text per turn at the same figure they bound a single
 * delta, so this cannot make an over-long answer deliverable — it keeps each
 * individual event inside the contract and lets the client apply its own limit
 * rather than having the server emit one event the client is obliged to reject.
 */
function splitForDeltas(text: string): string[] {
  if (text.length === 0) return [];
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += RUNTIME_V2_MODEL_DELTA_CHARACTERS) {
    chunks.push(text.slice(index, index + RUNTIME_V2_MODEL_DELTA_CHARACTERS));
  }
  return chunks;
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
