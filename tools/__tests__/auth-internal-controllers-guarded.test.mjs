import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// TD-035: auth-service's internal endpoints answer what a user's plan allows
// and spend their allowance. Two of them were @Public with no credential at
// all, isolated only by nginx not routing /api/v1/internal — which is a
// network fact, not an authorisation. Every one of them now requires the
// shared INTER_SERVICE_AUTH_TOKEN through ServiceTokenGuard.
const root = path.resolve(import.meta.dirname, '..', '..');
const controllersDir = path.join(root, 'apps', 'claw-auth-service', 'src', 'modules');

function internalControllers(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return internalControllers(full);
    return entry.isFile() && entry.name.endsWith('-internal.controller.ts') ? [full] : [];
  });
}

const controllers = internalControllers(controllersDir);

test('auth-service has internal controllers to check', () => {
  assert.ok(controllers.length >= 8, `found ${controllers.length}`);
});

for (const file of controllers) {
  const name = path.relative(root, file).replaceAll('\\', '/');
  test(`${name} requires the service token`, () => {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /@UseGuards\(\s*ServiceTokenGuard\s*\)/, 'missing @UseGuards(ServiceTokenGuard)');
    assert.match(
      source,
      /import \{ ServiceTokenGuard \} from '[^']*guards\/service-token\.guard'/,
      'must use the shared guard',
    );
  });
}
