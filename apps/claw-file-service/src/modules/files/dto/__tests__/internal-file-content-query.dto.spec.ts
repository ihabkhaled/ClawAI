import { internalFileContentQuerySchema } from '../internal-file-content-query.dto';

describe('internalFileContentQuerySchema', () => {
  it('accepts a bounded authenticated user ID', () => {
    expect(internalFileContentQuerySchema.parse({ userId: 'tenant-user-1' })).toEqual({
      userId: 'tenant-user-1',
    });
  });

  it.each([
    {},
    { userId: '' },
    { userId: 'u'.repeat(201) },
    { userId: null },
    { userId: 123 },
    { userId: 'tenant-user-1', unexpected: true },
  ])('rejects an invalid requester query %#', (query) => {
    expect(() => internalFileContentQuerySchema.parse(query)).toThrow();
  });
});
