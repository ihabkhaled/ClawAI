import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { registerSchema } from '../../../modules/auth/dto/register.dto';
import { ZodValidationPipe } from '../zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(registerSchema);
  const metadata = { type: 'body' as const };

  it('returns the parsed value when valid', () => {
    const out = pipe.transform(
      { email: 'A@B.CO', password: 'Str0ngPass', firstName: 'J', lastName: 'D' },
      metadata,
    );
    expect(out).toMatchObject({ email: 'a@b.co' });
  });

  it('throws VALIDATION_FAILED with every broken rule grouped by field', () => {
    let thrown: unknown;
    try {
      pipe.transform(
        { email: 'nope', password: 'short', firstName: 'J', lastName: 'D', phone: '12' },
        metadata,
      );
    } catch (error: unknown) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(BadRequestException);
    const body = (thrown as BadRequestException).getResponse();
    expect(body).toMatchObject({
      code: 'VALIDATION_FAILED',
      errors: {
        email: ['EMAIL_INVALID'],
        phone: ['PHONE_INVALID'],
      },
    });
    expect((body as { errors: Record<string, string[]> }).errors['password']).toEqual(
      expect.arrayContaining(['PASSWORD_TOO_SHORT', 'PASSWORD_NEEDS_UPPERCASE']),
    );
  });
});
