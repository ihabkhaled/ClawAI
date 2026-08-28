import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const DOCKERFILES = readdirSync(repoPath('apps'))
  .map((app) => `apps/${app}/Dockerfile`)
  .filter((file) => {
    try {
      const source = readFileSync(repoPath(file), 'utf8');
      // Images that COPY the lockfile are already safe: the lock records the
      // platform binaries, so npm installs them without help. Matched on the COPY
      // instruction rather than the words, because the fix's own comment explains
      // itself by naming package-lock.json.
      const copiesLock = source
        .split(String.fromCharCode(10))
        .some((line) => line.startsWith('COPY') && line.includes('package-lock.json'));
      return source.includes('npm install --ignore-scripts') && !copiesLock;
    } catch {
      return false;
    }
  });

test('every image that installs without the lockfile also installs the compiler binary', () => {
  // The root declares the compiler as an alias (typescript7 -> npm:typescript).
  // npm does not install an aliased package's platform optionalDependencies, so
  // @typescript/typescript-linux-x64 never lands and the shared-package build
  // fails with "Unable to resolve". CI never sees it because CI installs from
  // package-lock.json, which does record the binaries — these images do not.
  //
  // It stayed hidden until a change forced every service to rebuild: services
  // whose deps layer was still cached kept building from an image made before
  // the alias stopped resolving.
  assert.ok(DOCKERFILES.length > 10, 'expected the backend Dockerfiles to be found');

  for (const file of DOCKERFILES) {
    assert.match(
      readFileSync(repoPath(file), 'utf8'),
      /@typescript\/typescript-linux-x64@/u,
      `${file} installs dependencies without the lockfile but never installs the compiler binary`,
    );
  }
});

test('the binary version is derived from the resolved compiler, never hardcoded', () => {
  // A pinned version here would silently disagree with the compiler the moment
  // typescript7 resolved to a new release, and the mismatch surfaces only as a
  // failed production build.
  for (const file of DOCKERFILES) {
    const source = readFileSync(repoPath(file), 'utf8');
    assert.match(source, /typescript7\/package\.json'\)\.version/u, `${file} hardcodes the version`);
  }
});
