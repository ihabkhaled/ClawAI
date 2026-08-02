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

export function runtimeV2Unavailable(): BusinessException {
  return new BusinessException(
    'Runtime state is unavailable',
    'RUNTIME_STATE_UNAVAILABLE',
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}
