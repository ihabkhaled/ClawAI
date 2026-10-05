import { describe, expect, it } from 'vitest';

import { safeThreadCitationUrl } from '../thread-citation.utility';

describe('safeThreadCitationUrl', () => {
  it('keeps only absolute HTTP and HTTPS sources', () => {
    expect(safeThreadCitationUrl('https://example.com/article')).toBe(
      'https://example.com/article',
    );
    expect(safeThreadCitationUrl('http://example.com/article')).toBe('http://example.com/article');
    expect(safeThreadCitationUrl('javascript:alert(1)')).toBeNull();
    expect(safeThreadCitationUrl('//example.com/article')).toBeNull();
  });
});
