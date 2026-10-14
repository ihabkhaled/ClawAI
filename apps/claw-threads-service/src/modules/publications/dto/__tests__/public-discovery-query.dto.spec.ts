import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '../../../../app/pipes/zod-validation.pipe';
import {
  publicDiscoveryQuerySchema,
  publicSitemapQuerySchema,
} from '../public-discovery-query.dto';

const meta = { type: 'query' } as const;

describe('public discovery query validation', () => {
  it('answers 400, not 500, when locale is missing', () => {
    expect(() => new ZodValidationPipe(publicDiscoveryQuerySchema).transform({}, meta)).toThrow(
      BadRequestException,
    );
    expect(() => new ZodValidationPipe(publicSitemapQuerySchema).transform({}, meta)).toThrow(
      BadRequestException,
    );
  });

  it('turns the query string limit into a number and applies defaults', () => {
    expect(
      new ZodValidationPipe(publicDiscoveryQuerySchema).transform(
        { locale: 'en', limit: '10' },
        meta,
      ),
    ).toEqual({ locale: 'en', limit: 10 });
    expect(
      new ZodValidationPipe(publicSitemapQuerySchema).transform({ locale: 'en' }, meta),
    ).toEqual({
      locale: 'en',
      scope: 'locale',
      page: 0,
      limit: 5000,
    });
  });

  it('accepts scope=all without a locale and still rejects a missing locale otherwise', () => {
    expect(
      new ZodValidationPipe(publicSitemapQuerySchema).transform({ scope: 'all' }, meta),
    ).toEqual({ scope: 'all', page: 0, limit: 5000 });
    expect(() =>
      new ZodValidationPipe(publicSitemapQuerySchema).transform({ scope: 'locale' }, meta),
    ).toThrow(BadRequestException);
    expect(() =>
      new ZodValidationPipe(publicSitemapQuerySchema).transform({ scope: 'bogus' }, meta),
    ).toThrow(BadRequestException);
  });
});
