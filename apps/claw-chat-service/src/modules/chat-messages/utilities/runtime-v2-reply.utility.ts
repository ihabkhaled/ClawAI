import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';

import { BusinessException } from '../../../common/errors';
import {
  RUNTIME_V2_BUDGET_EXHAUSTED_CODE,
  RUNTIME_V2_BUDGET_EXHAUSTED_MESSAGE,
  RUNTIME_V2_BUDGET_EXHAUSTED_REASON,
} from '../constants/runtime-v2-failure.constants';
import type { RuntimeV2TaggedReply } from '../types/runtime-v2-store.types';

export function parseRuntimeV2TaggedReply(value: unknown): RuntimeV2TaggedReply {
  const parsed = z.tuple([z.string().max(32), z.string().max(1_500_000)]).safeParse(value);
  if (!parsed.success) {
    throw new BusinessException(
      'Runtime state is unavailable',
      'RUNTIME_STATE_UNAVAILABLE',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
  const [tag, body] = parsed.data;
  if (tag === 'OK' || tag === 'REPLAY' || tag === 'CLAIMED' || tag === 'REDIRECT')
    return { tag, body };
  if (tag === 'MISSING') {
    throw new BusinessException(
      'Runtime run was not found',
      'RUNTIME_RUN_NOT_FOUND',
      HttpStatus.NOT_FOUND,
    );
  }
  if (tag === 'CONFLICT') {
    throw new BusinessException(
      'Runtime replay conflicts with stored state',
      'RUNTIME_REPLAY_CONFLICT',
      HttpStatus.CONFLICT,
    );
  }
  throw denialException(body);
}

/**
 * Turns a Lua denial into an error a caller can act on.
 *
 * The script already says exactly why it refused — `BUDGET_EXHAUSTED`,
 * `RUN_TERMINAL`, `ALREADY_CLAIMED`, `RECEIPT_ARGUMENT_MISMATCH`,
 * `INVALID_RESULT_SIZE`, `STALE_CLAIM` — and all of it was collapsed into one
 * opaque "Runtime transition was denied". A client could not tell a run that
 * had used up its tool budget from one whose claim had gone stale, and neither
 * could an operator: the reason existed and was thrown away at the last step.
 *
 * The reason is a fixed vocabulary emitted by our own scripts, not user data,
 * so naming it in the message leaks nothing.
 */
function denialException(reason: string): BusinessException {
  if (reason === RUNTIME_V2_BUDGET_EXHAUSTED_REASON) {
    return new BusinessException(
      RUNTIME_V2_BUDGET_EXHAUSTED_MESSAGE,
      RUNTIME_V2_BUDGET_EXHAUSTED_CODE,
      HttpStatus.CONFLICT,
    );
  }
  return new BusinessException(
    `Runtime transition was denied: ${normalizedReason(reason)}`,
    'RUNTIME_TRANSITION_DENIED',
    HttpStatus.CONFLICT,
  );
}

/**
 * Denial bodies are short SCREAMING_SNAKE tokens. Anything else is unexpected
 * and is reported as unknown rather than echoed into the message.
 */
function normalizedReason(reason: string): string {
  return /^[A-Z][A-Z_]{2,63}$/u.test(reason) ? reason : 'UNKNOWN';
}

/**
 * Normalizes a stored binding blob before schema validation.
 *
 * The two binding readers store `toolDefinitions` differently and both are
 * correct. The message binding keeps the whole blob as one JSON document, so
 * the catalog arrives already decoded. The run-state binding keeps it as an
 * opaque string in a Redis hash field, deliberately, so the exact bytes the
 * catalog hash was computed over survive the round trip — the binding schema
 * re-hashes `JSON.stringify(toolDefinitions)` and a `cjson` decode/encode pass
 * in Lua could reorder object keys and fail a catalog that is perfectly valid.
 *
 * Parsing here rather than in the schema keeps that storage detail out of the
 * contract: callers get an array either way.
 */
export function parseStoredBinding(body: string): unknown {
  const parsed: unknown = JSON.parse(body);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;

  const record = parsed as Record<string, unknown>;
  const catalog = record['toolDefinitions'];
  if (typeof catalog !== 'string') return parsed;
  return { ...record, toolDefinitions: JSON.parse(catalog) };
}

export function runtimeV2Unavailable(): BusinessException {
  return new BusinessException(
    'Runtime state is unavailable',
    'RUNTIME_STATE_UNAVAILABLE',
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}
