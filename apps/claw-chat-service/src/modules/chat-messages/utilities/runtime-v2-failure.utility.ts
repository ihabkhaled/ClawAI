import { BusinessException } from '../../../common/errors';
import {
  RUNTIME_V2_ANNOUNCEMENT_EXCERPT_CHARACTERS,
  RUNTIME_V2_FAILURE_MESSAGE_CHARACTERS,
  RUNTIME_V2_STREAM_ERROR_EVENT_TYPE,
  RUNTIME_V2_UNKNOWN_FAILURE_CODE,
} from '../constants/runtime-v2-failure.constants';
import {
  RUNTIME_V2_REPAIR_DIAGNOSIS_CHARACTERS,
  RUNTIME_V2_REPAIR_DIAGNOSIS_PREFIX,
} from '../constants/runtime-v2-model-output.constants';
import type { RuntimeV2TerminalReason } from '../types/runtime-v2-store.types';

/**
 * Turns a thrown value into the bounded reason carried on `run.failed`.
 *
 * A failed run used to terminalize with an empty payload, so the client could
 * show that the run died but never why — every live failure meant reading
 * server logs. The message is truncated because it ends up on an event whose
 * payload is size-bounded, and it is never allowed to carry a stack trace,
 * which is where incidental paths and values tend to leak.
 */
export function runtimeV2TerminalReason(error: unknown): RuntimeV2TerminalReason {
  if (error instanceof BusinessException) {
    return { code: error.code, message: truncate(error.message) };
  }
  if (error instanceof Error) {
    return { code: RUNTIME_V2_UNKNOWN_FAILURE_CODE, message: truncate(error.message) };
  }
  return { code: RUNTIME_V2_UNKNOWN_FAILURE_CODE, message: truncate(String(error)) };
}

/**
 * The terminal event emitted when the SSE observable itself errors.
 *
 * NestJS serializes an errored SSE observable by writing the raw error message
 * onto the data line, so the client received `data: Runtime state is
 * unavailable` — not JSON. Every consumer parses the data line as JSON, so the
 * real error was replaced by a parse failure, and the extension reported the
 * useless "ClawAI stream returned an invalid event" instead of the actual
 * cause. Emitting a well-formed object keeps the failure legible.
 */
export function runtimeV2StreamErrorEvent(error: unknown): Readonly<Record<string, unknown>> {
  const reason = runtimeV2TerminalReason(error);
  return {
    type: RUNTIME_V2_STREAM_ERROR_EVENT_TYPE,
    code: reason.code,
    message: reason.message,
    timestamp: new Date().toISOString(),
  };
}

function truncate(message: string): string {
  const normalized = message.replaceAll(/\s+/gu, ' ').trim();
  if (normalized.length === 0) return 'Runtime run failed without a message';
  return normalized.length <= RUNTIME_V2_FAILURE_MESSAGE_CHARACTERS
    ? normalized
    : `${normalized.slice(0, RUNTIME_V2_FAILURE_MESSAGE_CHARACTERS - 1)}…`;
}

/**
 * A bounded, single-line quote of what the model actually said.
 *
 * The reason travels on a size-bounded event and is shown to the user, so the
 * announcement is quoted rather than paraphrased — hiding it would leave the
 * user guessing why nothing ran.
 */
export function excerpt(content: string): string {
  const normalized = content.replaceAll(/\s+/gu, ' ').trim();
  return normalized.length <= RUNTIME_V2_ANNOUNCEMENT_EXCERPT_CHARACTERS
    ? normalized
    : `${normalized.slice(0, RUNTIME_V2_ANNOUNCEMENT_EXCERPT_CHARACTERS)}…`;
}

/**
 * The parser's own account of why a tool request was refused.
 *
 * Handed to the model on the repair turn and included in the terminal failure,
 * because "your request was invalid" is not something either a model or a user
 * can act on — and the first parse failure used to be caught and thrown away.
 */
export function repairDiagnosis(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.replaceAll(/\s+/gu, ' ').trim();
  if (normalized.length === 0) return '';
  const bounded =
    normalized.length <= RUNTIME_V2_REPAIR_DIAGNOSIS_CHARACTERS
      ? normalized
      : `${normalized.slice(0, RUNTIME_V2_REPAIR_DIAGNOSIS_CHARACTERS)}…`;
  return `${RUNTIME_V2_REPAIR_DIAGNOSIS_PREFIX} ${bounded}`;
}
