import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { discoverWorkspaces, readJson, repoPath } from '../lib/repo.mjs';

// Guards the property "every workspace ships the same version as the repository".
//
// The monorepo publishes nothing to npm, so no install ever fails on a version
// mismatch — which is exactly why they drift silently. Before this test, 24 of 26
// workspaces still said 0.1.0 against a 1.0.0 root, three code sites hardcoded a
// version string of their own, and one service reported 0.1.0 on its /health
// endpoint. Nothing failed; the numbers were simply wrong.

const rootVersion = readJson(repoPath('package.json')).version;

test('the root package declares a concrete semver version', () => {
  assert.match(rootVersion, /^\d+\.\d+\.\d+$/u, `root version looks wrong: ${rootVersion}`);
});

test('every workspace matches the root version', () => {
  const mismatched = discoverWorkspaces()
    .filter((workspace) => workspace.pkg.version !== rootVersion)
    .map((workspace) => `${workspace.dir} is ${workspace.pkg.version}`);

  assert.deepEqual(
    mismatched,
    [],
    `workspaces out of step with root ${rootVersion}:\n  ${mismatched.join('\n  ')}`,
  );
});

test('internal @claw/* dependency pins match the root version', () => {
  // A pin left at an old version resolves to nothing: npm cannot satisfy
  // `@claw/shared-types@0.1.0` from a workspace that now declares 1.0.0, so the
  // symlink the whole build depends on is created by luck rather than by the
  // manifest saying what it means.
  const stale = [];
  for (const workspace of discoverWorkspaces()) {
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
      for (const [name, range] of Object.entries(workspace.pkg[field] ?? {})) {
        if (name.startsWith('@claw/') && range !== rootVersion && range !== '*') {
          stale.push(`${workspace.dir} ${field}.${name} = ${range}`);
        }
      }
    }
  }
  assert.deepEqual(stale, [], `internal pins out of step with ${rootVersion}:\n  ${stale.join('\n  ')}`);
});

test('no source file hardcodes a version string of its own', () => {
  // The three that did: the sidebar badge, llamacpp's /health SERVICE_VERSION,
  // and the architecture ESLint plugin's meta. All now read package.json.
  const offenders = [
    'apps/claw-frontend/src/components/layout/sidebar.tsx',
    'apps/claw-llamacpp-service/src/modules/health/constants/service-version.constants.ts',
    'eslint/architecture-plugin/index.mjs',
  ].filter((file) => {
    // Comments are stripped first: these files explain WHY they no longer hardcode
    // a version, and those explanations quote the old value. Matching prose would
    // make the fix look like the defect.
    const source = readFileSync(repoPath(file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .replace(/^\s*\/\/.*$/gmu, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/gu, '');
    // A bare quoted x.y.z literal. Dependency ranges (^1.2.3) do not match,
    // because the quote must directly precede the digit.
    return /['"`]\d+\.\d+\.\d+['"`]/u.test(source);
  });

  assert.deepEqual(offenders, [], `hardcoded version literal found in:\n  ${offenders.join('\n  ')}`);
});
