import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// TD-033: a revoked session's access token kept working until it expired,
// because a signature is not a database read. auth-service writes every
// revoked session to Redis and SessionRevocationGuard asks — but only in the
// services that register it. Thirteen services carry their own AuthGuard, so
// this is the only thing that keeps them in step.
const root = path.resolve(import.meta.dirname, '..', '..');
const modules = fs
  .readdirSync(path.join(root, 'apps'))
  .filter((app) => app.startsWith('claw-') && app.endsWith('-service'))
  .map((app) => ({ app, file: path.join(root, 'apps', app, 'src', 'app', 'app.module.ts') }))
  .filter(({ file }) => fs.existsSync(file))
  .map((entry) => ({ ...entry, source: fs.readFileSync(entry.file, 'utf8') }));

const authenticated = modules.filter(({ source }) =>
  /provide:\s*APP_GUARD,\s*useClass:\s*AuthGuard/u.test(source),
);

test('the services that authenticate requests are found', () => {
  assert.ok(authenticated.length >= 17, `found ${authenticated.length}`);
});

for (const { app, source } of authenticated) {
  test(`${app} refuses a revoked session`, () => {
    assert.match(
      source,
      /provide:\s*APP_GUARD,\s*useClass:\s*SessionRevocationGuard/u,
      'register SessionRevocationGuard as a global guard, after AuthGuard',
    );
    assert.match(
      source,
      /import \{[^}]*\bSessionRevocationGuard\b[^}]*\} from '@claw\/shared-auth'/u,
      'it comes from @claw/shared-auth',
    );
    const authAt = source.search(/provide:\s*APP_GUARD,\s*useClass:\s*AuthGuard/u);
    const revocationAt = source.search(/provide:\s*APP_GUARD,\s*useClass:\s*SessionRevocationGuard/u);
    assert.ok(authAt < revocationAt, 'it runs after AuthGuard, which decides the token itself');
  });
}
