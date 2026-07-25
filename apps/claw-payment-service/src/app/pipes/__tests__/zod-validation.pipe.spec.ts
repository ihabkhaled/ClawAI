import { type ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../zod-validation.pipe';

const metadata = { type: 'body' } as ArgumentMetadata;

const schema = z.object({
  planId: z.string().min(1).max(64),
  amountMinor: z.number().int().nonnegative(),
});

describe('ZodValidationPipe', () => {
  it('returns the parsed value on success', () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ planId: 'plan_1', amountMinor: 2000 }, metadata)).toEqual({
      planId: 'plan_1',
      amountMinor: 2000,
    });
  });

  it('strips unknown keys a non-strict schema does not declare', () => {
    // Mass-assignment guard: a client cannot smuggle an extra field through.
    const pipe = new ZodValidationPipe(schema);
    const result = pipe.transform(
      { planId: 'plan_1', amountMinor: 2000, isAdmin: true },
      metadata,
    ) as Record<string, unknown>;
    expect(result).not.toHaveProperty('isAdmin');
  });

  it('rejects a missing required field with a field-level error', () => {
    const pipe = new ZodValidationPipe(schema);
    try {
      pipe.transform({ amountMinor: 2000 }, metadata);
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const body = (error as BadRequestException).getResponse() as Record<string, unknown>;
      expect(body['message']).toBe('Validation failed');
      expect(body['errors']).toEqual([expect.objectContaining({ field: 'planId' })]);
    }
  });

  it('rejects a negative amount', () => {
    const pipe = new ZodValidationPipe(schema);
    expect(() => pipe.transform({ planId: 'p', amountMinor: -1 }, metadata)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a fractional amount, which would be a float in a money field', () => {
    const pipe = new ZodValidationPipe(schema);
    expect(() => pipe.transform({ planId: 'p', amountMinor: 20.5 }, metadata)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a null or non-object body', () => {
    const pipe = new ZodValidationPipe(schema);
    for (const value of [null, undefined, 'string', 42, []]) {
      expect(() => pipe.transform(value, metadata)).toThrow(BadRequestException);
    }
  });

  it('reports a dotted path for a nested field', () => {
    const nested = z.object({ price: z.object({ amountMinor: z.number().int() }) });
    const pipe = new ZodValidationPipe(nested);
    try {
      pipe.transform({ price: { amountMinor: 'x' } }, metadata);
      throw new Error('expected throw');
    } catch (error) {
      const body = (error as BadRequestException).getResponse() as Record<string, unknown>;
      expect(body['errors']).toEqual([expect.objectContaining({ field: 'price.amountMinor' })]);
    }
  });

  it('reports every failing field, not just the first', () => {
    const pipe = new ZodValidationPipe(schema);
    try {
      pipe.transform({}, metadata);
      throw new Error('expected throw');
    } catch (error) {
      const body = (error as BadRequestException).getResponse() as Record<string, unknown>;
      expect((body['errors'] as unknown[]).length).toBe(2);
    }
  });
});
