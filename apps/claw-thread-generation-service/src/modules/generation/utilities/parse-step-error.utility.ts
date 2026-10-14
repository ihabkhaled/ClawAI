import {
  STEP_CANCELLED_CODE,
  STEP_ERROR_CAUSE_DEPTH,
  STEP_FALLBACK_ERROR_CODE,
  STEP_MESSAGE_CODES,
  STEP_UPSTREAM_CODE_ALIASES,
  STEP_UPSTREAM_UNAVAILABLE_CODE,
  STEP_UPSTREAM_UNAVAILABLE_STATUS,
  UPSTREAM_STATUS_PATTERN,
  UPSTREAM_UNAVAILABLE_CODES,
} from '../constants/step-recorder.constants';
import type { ParsedStepError } from '../types/step-recorder.types';
import { CandidatesExhaustedError } from './candidates-exhausted.error';
import { ThreadGenerationCancelledError } from './thread-generation-cancelled.error';

function statusCode(status: number): string {
  return status === 429 ? 'PROVIDER_RATE_LIMITED' : STEP_FALLBACK_ERROR_CODE;
}

function parseOne(error: Error): ParsedStepError | null {
  if (error instanceof CandidatesExhaustedError) {
    return { code: error.primary.code, httpStatus: error.primary.httpStatus };
  }
  if (error instanceof ThreadGenerationCancelledError) {
    return { code: STEP_CANCELLED_CODE, httpStatus: null };
  }
  const upstream = UPSTREAM_STATUS_PATTERN.exec(error.message);
  if (upstream?.[1]) {
    const httpStatus = Number(upstream[1]);
    const rawCode = upstream[2] ?? statusCode(httpStatus);
    const code = STEP_UPSTREAM_CODE_ALIASES.get(rawCode) ?? rawCode;
    // The chat service reports a provider outage (for example Gemini 503) with a 400 envelope.
    return UPSTREAM_UNAVAILABLE_CODES.has(code)
      ? { code: STEP_UPSTREAM_UNAVAILABLE_CODE, httpStatus: STEP_UPSTREAM_UNAVAILABLE_STATUS }
      : { code, httpStatus };
  }
  const known = STEP_MESSAGE_CODES.find(({ fragment }) => error.message.includes(fragment));
  return known ? { code: known.code, httpStatus: null } : null;
}

/**
 * Maps a thrown error to a stable machine code. The cause chain is walked because the
 * pipeline wraps the upstream failure; the innermost upstream status wins over a wrapper, except
 * that a role whose every candidate failed reports its primary cause, not the last candidate's.
 */
export function parseStepError(
  error: unknown,
  fallbackCode: string = STEP_FALLBACK_ERROR_CODE,
): ParsedStepError {
  let current: unknown = error;
  let wrapper: ParsedStepError | null = null;
  for (let depth = 0; depth < STEP_ERROR_CAUSE_DEPTH && current instanceof Error; depth += 1) {
    const parsed = parseOne(current);
    // The primary cause is final: the last fallback's status deeper in the chain must not replace it.
    if (current instanceof CandidatesExhaustedError && parsed) return parsed;
    if (parsed && parsed.httpStatus !== null) return parsed;
    wrapper ??= parsed;
    current = current.cause;
  }
  return wrapper ?? { code: fallbackCode, httpStatus: null };
}
