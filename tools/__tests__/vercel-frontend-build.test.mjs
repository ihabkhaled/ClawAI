import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { env, execPath } from 'node:process';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { repoPath } from '../lib/repo.mjs';

function filesUnder(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = `${directory}/${name}`;
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

test('frontend Vercel install includes declared workspaces without changing backend installs', () => {
  const manifest = JSON.parse(readFileSync(repoPath('deploy/vercel/projects.json'), 'utf8'));
  const frontend = manifest.projects.find((project) => project.key === 'frontend');
  const auth = manifest.projects.find((project) => project.key === 'auth');
  const generated = JSON.parse(readFileSync(repoPath('apps/claw-frontend/vercel.json'), 'utf8'));

  assert.equal(frontend.installCommand, 'cd ../.. && npm ci');
  assert.equal(auth.installCommand, 'cd ../.. && npm ci');
  assert.equal(generated.installCommand, frontend.installCommand);
  assert.equal(generated.git.deploymentEnabled, true);

  const validation = spawnSync(execPath, ['scripts/vercel/validate.mjs'], {
    cwd: repoPath(),
    encoding: 'utf8',
  });
  assert.equal(validation.status, 0, validation.stdout + validation.stderr);
});

test('Turbopack production filesystem caching is enabled only on Vercel', async () => {
  const configUrl = pathToFileURL(repoPath('apps/claw-frontend/next.config.mjs'));
  const previousVercel = env.VERCEL;

  try {
    delete env.VERCEL;
    const localConfig = (await import(`${configUrl.href}?environment=local`)).default;
    assert.equal(localConfig.experimental.turbopackFileSystemCacheForBuild, false);

    env.VERCEL = '1';
    const vercelConfig = (await import(`${configUrl.href}?environment=vercel`)).default;
    assert.equal(vercelConfig.experimental.turbopackFileSystemCacheForBuild, true);
  } finally {
    if (previousVercel === undefined) {
      delete env.VERCEL;
    } else {
      env.VERCEL = previousVercel;
    }
  }
});

test('frontend Vercel build compiles only its declared shared workspace dependency', () => {
  const buildScript = readFileSync(repoPath('scripts/vercel/build-service.sh'), 'utf8');
  const frontendPackage = JSON.parse(
    readFileSync(repoPath('apps/claw-frontend/package.json'), 'utf8'),
  );
  const declaredDependencies = {
    ...frontendPackage.dependencies,
    ...frontendPackage.devDependencies,
    ...frontendPackage.optionalDependencies,
    ...frontendPackage.peerDependencies,
  };

  assert.match(buildScript, /if \[\[ "\$\{WORKSPACE\}" == "claw-frontend" \]\]/);
  assert.match(buildScript, /npm run build --workspace=@claw\/shared-types/);
  assert.deepEqual(
    Object.keys(declaredDependencies).filter((name) => name.startsWith('@claw/')),
    ['@claw/shared-types'],
  );

  const workspaceImports = filesUnder(repoPath('apps/claw-frontend/src'))
    .filter((path) => /\.[cm]?[jt]sx?$/u.test(path))
    .flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return source.includes("from '@claw/") || source.includes('from "@claw/') ? [path] : [];
    });
  assert.deepEqual(workspaceImports, [], 'frontend source imports undeclared @claw workspaces');
});

test('Vercel preserves the frontend build cache without changing local build behavior', () => {
  const buildScript = readFileSync(repoPath('scripts/vercel/build-service.sh'), 'utf8');
  const frontendPackage = JSON.parse(
    readFileSync(repoPath('apps/claw-frontend/package.json'), 'utf8'),
  );

  assert.equal(frontendPackage.scripts.build, 'npm run clear-cache && next build --turbopack');
  assert.equal(frontendPackage.scripts['build:vercel'], 'next build --turbopack');
  assert.match(buildScript, /npm run build:vercel --workspace="\$\{WORKSPACE\}"/);
});

test('Tailwind config is explicitly loaded as an ES module', () => {
  const globals = readFileSync(repoPath('apps/claw-frontend/src/app/globals.css'), 'utf8');

  assert.match(globals, /@config '\.\.\/\.\.\/tailwind\.config\.mts';/);
  assert.equal(existsSync(repoPath('apps/claw-frontend/tailwind.config.mts')), true);
  assert.equal(existsSync(repoPath('apps/claw-frontend/tailwind.config.ts')), false);
});
