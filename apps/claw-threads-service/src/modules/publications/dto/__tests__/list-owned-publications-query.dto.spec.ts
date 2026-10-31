import { BadRequestException } from '@nestjs/common';

import { ZodValidationPipe } from '../../../../app/pipes/zod-validation.pipe';
import { listOwnedPublicationsQuerySchema } from '../list-owned-publications-query.dto';

const pipe = new ZodValidationPipe(listOwnedPublicationsQuerySchema);
const parse = (input: unknown) => pipe.transform(input, { type: 'query' });

describe('listOwnedPublicationsQuerySchema', () => {
  it('defaults to page 1, 10 per page, no search, ALL', () => {
    expect(parse({})).toEqual({ page: 1, pageSize: 10, q: undefined, status: 'ALL' });
  });

  it('coerces query strings and trims q', () => {
    expect(parse({ page: '3', pageSize: '50', q: '  hello  ', status: 'FAILED' })).toEqual({
      page: 3,
      pageSize: 50,
      q: 'hello',
      status: 'FAILED',
    });
  });

  it('treats a blank q as no search', () => {
    expect(parse({ q: '   ' })).toMatchObject({ q: undefined });
  });

  it.each([
    ['page 0', { page: '0' }],
    ['negative page', { page: '-1' }],
    ['fractional page', { page: '1.5' }],
    ['text page', { page: 'abc' }],
    ['empty page', { page: '' }],
    ['huge page', { page: '99999999' }],
    ['pageSize 0', { pageSize: '0' }],
    ['pageSize 51', { pageSize: '51' }],
    ['text pageSize', { pageSize: 'ten' }],
    ['unknown status', { status: 'DONE' }],
    ['lower-case status', { status: 'ready' }],
    ['q over 100 chars', { q: 'a'.repeat(101) }],
    ['q with NUL', { q: 'a\u0000b' }],
    ['q as array', { q: ['a', 'b'] }],
  ])('rejects %s with the standard 400', (_name, input) => {
    expect(() => parse(input)).toThrow(BadRequestException);
  });

  it('accepts the bounds: q of 100 chars, pageSize 1 and 50', () => {
    expect(parse({ q: 'a'.repeat(100), pageSize: '1' })).toMatchObject({ pageSize: 1 });
    expect(parse({ pageSize: '50' })).toMatchObject({ pageSize: 50 });
  });
});
