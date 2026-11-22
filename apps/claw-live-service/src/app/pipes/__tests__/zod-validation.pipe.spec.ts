/// <reference types="vitest/globals" />
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ url: z.string().url() }));
  const metadata = { type: 'body' as const };

  it('returns the parsed value', () => {
    expect(pipe.transform({ url: 'https://example.com/live.m3u8' }, metadata)).toEqual({
      url: 'https://example.com/live.m3u8',
    });
  });

  it('rejects an invalid body with the failing fields', () => {
    expect.assertions(2);
    try {
      pipe.transform({ url: 'nope' }, metadata);
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        message: 'Validation failed',
        errors: [{ field: 'url' }],
      });
    }
  });
});
