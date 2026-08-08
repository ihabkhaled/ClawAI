import { describe, expect, it, vi } from 'vitest';

import { GET } from './route';

describe('GET /ads.txt', () => {
  it('returns the exact authorized seller record as plain text', async () => {
    vi.stubEnv('ADSENSE_PUBLISHER_ID', 'pub-2415314275784926');

    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await response.text()).toBe(
      'google.com, pub-2415314275784926, DIRECT, f08c47fec0942fa0',
    );
  });
});
