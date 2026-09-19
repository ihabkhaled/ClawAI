import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// rules/07 §8: a filename reaches Content-Disposition only through the shared
// contentDispositionHeader. A raw `filename="${name}"` 500s on any name above
// U+00FF (Node refuses the header), which is how every Arabic or Chinese AI
// file failed to download until 2026-09-19.
const root = path.resolve(import.meta.dirname, '..', '..');

// Sites that build the header themselves, each safe for a stated reason. A new
// entry needs the same: a reason the name can never leave printable ASCII.
const ALLOWED = new Map([
  [
    'apps/claw-file-generation-service/src/modules/file-generation/utilities/file-asset.utility.ts',
    'already RFC 5987: an ASCII fallback plus filename*, both precomputed and tested',
  ],
  [
    'apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts',
    'the name is `${invoice.number}.pdf`, generated ASCII',
  ],
  [
    'apps/claw-workspace-service/src/modules/workspace/utilities/file-content-stream.utility.ts',
    'the name is percent-encoded by encodeRfc5987 before it is quoted',
  ],
]);

test('no service writes a raw filename into Content-Disposition', () => {
  const out = execFileSync(
    'git',
    ['grep', '-l', '-E', 'filename="\\$\\{', '--', 'apps/*/src/**/*.ts', ':!**/__tests__/**', ':!**/*.spec.ts'],
    { cwd: root, encoding: 'utf8' },
  );
  const offenders = out
    .split('\n')
    .filter(Boolean)
    .filter((file) => !ALLOWED.has(file))
    // Log lines quote filenames too; only a header assignment matters.
    .filter((file) => {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      return /Content-Disposition[^\n]*filename="\$\{/.test(source) || /disposition[^\n]*filename="\$\{/i.test(source);
    });
  assert.deepEqual(offenders, [], `use contentDispositionHeader from @claw/shared-utilities (rules/07 §8)`);
});
