import { describe, it, expect } from 'vitest';

import { readFileAsBase64 } from '@/utilities/file-read.utility';

describe('readFileAsBase64', () => {
  it('returns the base64 payload without the data-URL prefix', async () => {
    // "hello" → aGVsbG8=
    const file = new File(['hello'], 'h.txt', { type: 'text/plain' });
    const result = await readFileAsBase64(file);
    expect(result).toBe('aGVsbG8=');
  });

  it('returns empty string for an empty file', async () => {
    const file = new File([], 'empty.txt', { type: 'text/plain' });
    const result = await readFileAsBase64(file);
    expect(result).toBe('');
  });
});
