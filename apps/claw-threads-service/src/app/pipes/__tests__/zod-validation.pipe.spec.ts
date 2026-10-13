import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../zod-validation.pipe';

const schema = z.object({
  name: z.string().min(2),
  topic: z.string().refine((value) => value !== 'bad', {
    message: 'Topic is bad',
    params: { code: 'THREAD_TOPIC_INVALID' },
  }),
});

function failure(value: unknown): BadRequestException {
  try {
    new ZodValidationPipe(schema).transform(value, { type: 'body' });
  } catch (error: unknown) {
    if (error instanceof BadRequestException) return error;
  }
  throw new Error('expected a validation failure');
}

describe('ZodValidationPipe', () => {
  it('returns the parsed value', () => {
    expect(
      new ZodValidationPipe(schema).transform({ name: 'ab', topic: 'ok' }, { type: 'body' }),
    ).toEqual({ name: 'ab', topic: 'ok' });
  });

  it('passes a refinement code through on the field and on the body', () => {
    expect(failure({ name: 'ab', topic: 'bad' }).getResponse()).toEqual({
      message: 'Validation failed',
      code: 'THREAD_TOPIC_INVALID',
      errors: [{ field: 'topic', message: 'Topic is bad', code: 'THREAD_TOPIC_INVALID' }],
    });
  });

  it('adds no code when the failure carries none', () => {
    const body = failure({ name: 'a', topic: 'ok' }).getResponse();

    expect(body).not.toHaveProperty('code');
    expect(body).toMatchObject({ message: 'Validation failed', errors: [{ field: 'name' }] });
  });
});
