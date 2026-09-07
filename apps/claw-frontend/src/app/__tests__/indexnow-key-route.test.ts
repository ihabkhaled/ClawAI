import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INDEXNOW_KEY, INDEXNOW_KEY_PATH } from '@/constants/indexnow.constants';

// Matches the other discovery route tests: the dynamic import, not the
// assertion, is what exceeds vitest's 5s default on a loaded machine.
const DYNAMIC_IMPORT_TIMEOUT_MS = 20_000;

// IndexNow proves domain ownership by fetching `/<key>.txt` and comparing the
// body to the key it was handed. Everything that can go wrong is a mismatch
// nothing else would notice: a renamed directory, a stray newline, or a staging
// host answering for the canonical origin. Each returns a flat 403 from the
// search engine with no hint about which one it was.
describe('IndexNow key file', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env['SITE_URL'];
    delete process.env['VERCEL_ENV'];
  });

  // The route directory name IS the served path, so a rotation that edits the
  // constant but forgets the rename would serve the new key at the old URL —
  // verification then fails while both halves look correct in isolation.
  it('is served at the path the key names', () => {
    const appDirectory = join(process.cwd(), 'src', 'app');
    const routeDirectory = `${INDEXNOW_KEY}.txt`;

    expect(readdirSync(appDirectory)).toContain(routeDirectory);
    expect(existsSync(join(appDirectory, routeDirectory, 'route.ts'))).toBe(true);
    expect(INDEXNOW_KEY_PATH).toBe(`/${routeDirectory}`);
  });

  it(
    'is rendered at request time so runtime configuration controls it',
    async () => {
      const route = await import(`../${INDEXNOW_KEY}.txt/route`);
      expect(route.dynamic).toBe('force-dynamic');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'serves the bare key, with no trailing newline or whitespace',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env['SITE_URL'] = 'https://claw.example';

      const route = await import(`../${INDEXNOW_KEY}.txt/route`);
      const response = route.GET();
      const body = await response.text();

      expect(response.status).toBe(200);
      // Not `toContain`: a trailing newline is the classic reason verification
      // returns 403 while the file looks right in a browser.
      expect(body).toBe(INDEXNOW_KEY);
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  // Ownership is re-fetched on demand, so a rotation must not be answered from
  // an edge cache holding the previous key.
  it(
    'is never cached',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env['SITE_URL'] = 'https://claw.example';

      const route = await import(`../${INDEXNOW_KEY}.txt/route`);

      expect(route.GET().headers.get('Cache-Control')).toBe('no-store');
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  // A staging host serving the key could have ITS urls submitted as the real
  // site's — the same URLs the rest of the discovery layer already refuses to
  // publish there.
  it(
    'refuses to claim ownership from a non-canonical deployment',
    async () => {
      delete process.env['SITE_URL'];

      const route = await import(`../${INDEXNOW_KEY}.txt/route`);

      expect(route.GET().status).toBe(404);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );

  it(
    'refuses to claim ownership from a Vercel preview deployment',
    async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env['SITE_URL'] = 'https://claw.example';
      process.env['VERCEL_ENV'] = 'preview';

      const route = await import(`../${INDEXNOW_KEY}.txt/route`);

      expect(route.GET().status).toBe(404);
    },
    DYNAMIC_IMPORT_TIMEOUT_MS,
  );
});
