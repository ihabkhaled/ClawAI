import { describe, expect, it } from 'vitest';

import { parsePublicationIdParam } from '@/utilities/thread-publication-id-param.utility';

describe('parsePublicationIdParam', () => {
  it('keeps a cuid-shaped id', () => {
    expect(parsePublicationIdParam('cmuxq509w000qaspkiaeb65jz')).toBe('cmuxq509w000qaspkiaeb65jz');
  });

  it.each(['../auth/users', 'abc/def', 'x'.repeat(41), 'short', 'UPPER0123456789', ''])(
    'drops %s',
    (value) => {
      expect(parsePublicationIdParam(value)).toBe('');
    },
  );

  it('treats a missing param as none', () => {
    expect(parsePublicationIdParam(null)).toBe('');
  });
});
