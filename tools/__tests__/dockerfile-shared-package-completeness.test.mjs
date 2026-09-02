// Every service Dockerfile must build every @claw/shared-* package the service
// declares. Host `packages/*/dist` is COPIED into the image (root .dockerignore
// keeps it on purpose), so a package the Dockerfile forgets to rebuild silently
// runs whatever stale dist the developer's machine had. On 2026-09-02 that was
// a shared-entitlements dist emitted before `tsc-alias -f` existed: its
// extensionless relative imports crashed payment-service under ESM with
// ERR_MODULE_NOT_FOUND. Nine Dockerfile.dev files had the gap; every prod
// Dockerfile had the line, which is why it never showed in CI or production.
//
// The sibling test (shared-package-build-order) checks the ORDER of what a
// recipe builds. This one checks the recipe is COMPLETE for its consumer.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const SHARED_SCOPE = '@claw/';
const SHARED_PREFIX = 'shared-';
const DOCKERFILE_NAMES = ['Dockerfile', 'Dockerfile.dev'];

function declaredSharedPackages(manifest) {
  const sections = [manifest.dependencies ?? {}, manifest.devDependencies ?? {}];
  return sections
    .flatMap((section) => Object.keys(section))
    .filter((name) => name.startsWith(`${SHARED_SCOPE}${SHARED_PREFIX}`))
    .map((name) => name.slice(SHARED_SCOPE.length));
}

function buildsPackage(dockerfileSource, packageName) {
  const pattern = new RegExp(`packages/${packageName} *&& *npm run build`, 'u');
  return dockerfileSource.split(/\r?\n/u).some((line) => pattern.test(line));
}

function serviceDirectories() {
  return readdirSync(repoPath('apps'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => repoPath('apps', entry.name));
}

test('every service Dockerfile builds every shared package the service declares', () => {
  const violations = [];
  let checkedDockerfiles = 0;

  for (const serviceDirectory of serviceDirectories()) {
    const manifestPath = join(serviceDirectory, 'package.json');
    if (!existsSync(manifestPath)) {
      continue;
    }
    const declared = declaredSharedPackages(JSON.parse(readFileSync(manifestPath, 'utf8')));
    if (declared.length === 0) {
      continue;
    }

    for (const dockerfileName of DOCKERFILE_NAMES) {
      const dockerfilePath = join(serviceDirectory, dockerfileName);
      if (!existsSync(dockerfilePath)) {
        continue;
      }
      checkedDockerfiles += 1;
      const source = readFileSync(dockerfilePath, 'utf8');
      for (const packageName of declared) {
        if (!buildsPackage(source, packageName)) {
          violations.push(
            `${relative(repoPath(), dockerfilePath)} never builds packages/${packageName} ` +
              `(declared in ${relative(repoPath(), manifestPath)})`,
          );
        }
      }
    }
  }

  assert.ok(checkedDockerfiles >= 30, `expected at least 30 Dockerfiles, checked ${checkedDockerfiles}`);
  assert.deepEqual(
    violations,
    [],
    `Dockerfiles that copy a stale host dist instead of building the package:\n  ${violations.join('\n  ')}`,
  );
});
