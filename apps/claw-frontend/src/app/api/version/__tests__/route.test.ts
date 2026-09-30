import { describe, expect, it } from 'vitest';

import { APP_VERSION } from '@/constants';

import { dynamic, GET } from '../route';

describe('GET /api/version', () => {
  it('answers with the running version and is never cached', async () => {
    const response = GET();
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ version: APP_VERSION });
  });

  // A statically rendered answer would freeze the build's version into the
  // HTML cache and the banner could never tell a deploy happened.
  it('is rendered per request', () => {
    expect(dynamic).toBe('force-dynamic');
  });
});
