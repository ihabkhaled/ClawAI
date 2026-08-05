import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';

import { BusinessException } from '../../../common/errors';
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
  throw new BusinessException(
    'Runtime transition was denied',
    'RUNTIME_TRANSITION_DENIED',
    HttpStatus.CONFLICT,
  );
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
