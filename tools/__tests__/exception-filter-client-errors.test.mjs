import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// TD-032: every service's GlobalExceptionFilter used to turn body-parser's
// 400/413/415 into a 500. The fix is one shared helper; this keeps a new or
// rewritten filter from quietly dropping it.
const root = path.resolve(import.meta.dirname, '..', '..');
const filters = fs
  .readdirSync(path.join(root, 'apps'))
  .map((app) => path.join(root, 'apps', app, 'src', 'app', 'filters', 'global-exception.filter.ts'))
  .filter((file) => fs.existsSync(file));

test('there are service exception filters to check', () => {
  assert.ok(filters.length >= 17, `found ${filters.length}`);
});

for (const file of filters) {
  const name = path.relative(root, file).replaceAll('\\', '/');
  test(`${name} returns a body-parser 4xx as a 4xx`, () => {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /isClientHttpError\(exception\)/, 'missing the isClientHttpError branch');
    assert.match(source, /import \{[^}]*\bisClientHttpError\b[^}]*\} from ['"]@claw\/shared-utilities['"]/, 'must use the shared helper, not a copy');
  });
}
