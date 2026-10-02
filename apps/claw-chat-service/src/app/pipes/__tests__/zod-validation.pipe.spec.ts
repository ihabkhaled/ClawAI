import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ZodValidationPipe } from '../zod-validation.pipe';

const bodyOf = (pipe: ZodValidationPipe, value: unknown): Record<string, unknown> => {
  try {
    pipe.transform(value, { type: 'body' });
  } catch (error) {
    if (error instanceof BadRequestException) return error.getResponse() as Record<string, unknown>;
    throw error;
  }
  throw new Error('expected a rejection');
};

describe('ZodValidationPipe codes', () => {
  const schema = z.object({
    kind: z.custom<string>((v) => v === 'ok', {
      error: 'kind must be ok',
      params: { code: 'KIND_UNKNOWN' },
    }),
    n: z.number(),
  });

  it('lifts the first issue-level code onto the body', () => {
    const body = bodyOf(new ZodValidationPipe(schema), { kind: 'no', n: 'x' });
    expect(body['code']).toBe('KIND_UNKNOWN');
    expect(body['errors']).toMatchObject({ kind: ['kind must be ok'] });
  });

  it('falls back to a generic stable code', () => {
    const body = bodyOf(new ZodValidationPipe(schema), { kind: 'ok', n: 'x' });
    expect(body['code']).toBe('VALIDATION_FAILED');
  });
});
