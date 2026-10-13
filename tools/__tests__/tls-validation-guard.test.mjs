import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { repoPath } from '../lib/repo.mjs';

// CodeQL js/disabling-certificate-validation fails CI for any committed file that switches TLS
// validation off. The local mkcert root is trusted with NODE_EXTRA_CA_CERTS instead.
// The shapes CodeQL reports: a direct assignment of '0' and rejectUnauthorized: false.
const FORBIDDEN = /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"]|rejectUnauthorized\s*:\s*false/u;
const CODE_FILE = /\.(?:c|m)?(?:j|t)sx?$/u;
const THIS_FILE = 'tools/__tests__/tls-validation-guard.test.mjs';

function acceptedPaths() {
  const document = JSON.parse(readFileSync(repoPath('tools', 'security', 'codeql-accepted.json'), 'utf8'));
  return new Set(
    document.accepted
      .filter((entry) => entry.rule === 'js/disabling-certificate-validation')
      .map((entry) => entry.path),
  );
}

test('no committed file disables TLS certificate validation unless CodeQL acceptance names it', () => {
  const accepted = acceptedPaths();
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: repoPath(), encoding: 'utf8' })
    .split('\0')
    .filter((path) => CODE_FILE.test(path) && path !== THIS_FILE && !accepted.has(path));
  const offenders = files.filter((path) => FORBIDDEN.test(readFileSync(repoPath(path), 'utf8')));
  assert.deepEqual(
    offenders,
    [],
    `These files disable certificate validation (use NODE_EXTRA_CA_CERTS with the mkcert root): ${offenders.join(', ')}`,
  );
});
