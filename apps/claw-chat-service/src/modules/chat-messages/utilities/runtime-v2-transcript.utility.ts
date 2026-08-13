import {
  RUNTIME_V2_TRANSCRIPT_CLIP_STEPS,
  RUNTIME_V2_TRANSCRIPT_IDENTITY_CHARACTERS,
  RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS,
  RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE,
} from '../constants/runtime-v2-transcript.constants';
import type { RuntimeResultDto, ToolInvocationDto } from '../dto/runtime-v2.dto';
import type { RuntimeV2JsonValue, RuntimeV2TranscriptClipStep } from '../types/runtime-v2.types';

/**
 * The transcript line recording a tool the model asked for, in the exact wire
 * shape the protocol requires it to emit.
 *
 * It used to read `Tool request: workspace.files/list {…}`. The model reads its
 * own history to decide what a request looks like, so it imitated that prose —
 * and prose is parsed as a final answer, which put the line
 * `Tool request: workspace.files/list {"rootKey":"workspace-1","path":"src"}`
 * in front of the user as the response and ended the task. Recording the same
 * JSON object the instruction demands makes imitation produce a valid request
 * instead of a wrong one.
 *
 * The arguments stay included because "I already listed apps/" is only useful
 * when the arguments are visible; without them a repeated call looks new.
 */
export function buildRuntimeV2ToolRequestRecord(invocation: ToolInvocationDto): string {
  return JSON.stringify({
    kind: 'tool',
    toolName: invocation.toolName,
    toolVersion: invocation.toolVersion,
    operation: invocation.operation,
    arguments: invocation.arguments,
    targetId: invocation.targetId,
  });
}

/**
 * The transcript line recording what a tool returned.
 *
 * It follows the request it answers and is stored under the tool role, so the
 * adjacency and the role carry the meaning — a prose label adds nothing and
 * costs something. glm-5.2 answered a request with the literal text
 * `Tool result: {"status":"succeeded",…}`: having been shown a labelled result
 * it produced a labelled result, and that was rendered to the user as the
 * answer. Both halves of the trail are now the bare documents they describe.
 *
 * Over-budget results are shortened by clipping their bulky LEAVES, never by
 * slicing the serialised document. A slice cut wherever the budget landed,
 * which in practice was inside a file's `content` — and it took the `hash` that
 * followed with it. `patch` cannot write without that hash, so the next turn
 * re-read the file, narrated, lost it again, and looped. Keeping the short
 * scalars whole and spending the budget only on payload inverts that: the
 * transcript retains the identity of what was read and drops the bytes the
 * model already consumed in full on the turn they arrived.
 */
export function buildRuntimeV2ToolResultRecord(result: RuntimeResultDto['result']): string {
  const record: RuntimeV2JsonValue = {
    status: result.status,
    structured: result.structured ?? null,
    modelText: result.modelText ?? null,
    error: result.error ?? null,
  };
  const document = JSON.stringify(record);
  if (document.length <= RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS) return document;

  for (const step of RUNTIME_V2_TRANSCRIPT_CLIP_STEPS) {
    const clipped = JSON.stringify(clip(record, step));
    if (clipped.length <= RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS) return clipped;
  }
  return bounded(JSON.stringify(clip(record, RUNTIME_V2_TRANSCRIPT_CLIP_STEPS.at(-1))));
}

// `Array.isArray` is declared as `arg is any[]`, which does not remove a
// `readonly` array from the union in the negative branch, so the object case
// below stays polluted without an explicit guard.
function isJsonArray(value: RuntimeV2JsonValue): value is readonly RuntimeV2JsonValue[] {
  return Array.isArray(value);
}

function clip(value: RuntimeV2JsonValue, step?: RuntimeV2TranscriptClipStep): RuntimeV2JsonValue {
  if (step === undefined) return value;
  if (typeof value === 'string') return clipString(value, step.strings);
  if (value === null || typeof value !== 'object') return value;
  if (isJsonArray(value)) return clipArray(value, step);
  return clipObject(value, step);
}

function clipObject(
  value: Readonly<Record<string, RuntimeV2JsonValue>>,
  step: RuntimeV2TranscriptClipStep,
): RuntimeV2JsonValue {
  const entries = Object.entries(value).map(
    ([key, entry]): readonly [string, RuntimeV2JsonValue] => [key, clip(entry, step)],
  );
  return Object.fromEntries(entries) as RuntimeV2JsonValue;
}

/**
 * A leaf at or under the identity floor is never touched, so a `sha256:` digest
 * (71 characters) survives every tightening step. Past the floor the value is
 * replaced outright rather than shortened, because half a payload is worth
 * nothing to the next turn while the notice at least records that something was
 * there.
 */
function clipString(value: string, budget: number): string {
  if (value.length <= budget) return value;
  if (budget <= RUNTIME_V2_TRANSCRIPT_IDENTITY_CHARACTERS)
    return RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE;
  return `${value.slice(0, budget)}${RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE}`;
}

function clipArray(
  value: readonly RuntimeV2JsonValue[],
  step: RuntimeV2TranscriptClipStep,
): readonly RuntimeV2JsonValue[] {
  if (value.length <= step.elements) return value.map((entry) => clip(entry, step));
  const kept = value.slice(0, step.elements).map((entry) => clip(entry, step));
  const omitted = value.length - step.elements;
  return [...kept, `…[${String(omitted)} more omitted in transcript]`];
}

// Last resort. The clip steps handle every result shape seen in the lab, but a
// record made of hundreds of distinct short keys would still exceed the bound,
// and the transcript bound has to hold regardless of shape.
function bounded(document: string): string {
  if (document.length <= RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS) return document;
  const room =
    RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS - RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE.length;
  return `${document.slice(0, room)}${RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE}`;
}
