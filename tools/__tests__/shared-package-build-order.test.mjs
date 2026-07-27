import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const SHARED_PACKAGE_PREFIX = '@claw/shared-';
const BUILD_COMMAND_PATTERN = /(?:npx tsgo|npm run build --workspace=)/u;
const SHARED_PACKAGE_PATTERN = /(?:packages\/|\.\.\/|@claw\/)(shared-[a-z-]+)/gu;

function listDockerfiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listDockerfiles(path);
    }
    return basename(entry.name).startsWith('Dockerfile') ? [path] : [];
  });
}

function extractBuildRecipes(source) {
  const recipes = [];
  let current = [];

  const flush = () => {
    if (current.length > 0) {
      recipes.push(current);
      current = [];
    }
  };

  for (const line of source.split(/\r?\n/u)) {
    if (!BUILD_COMMAND_PATTERN.test(line)) {
      flush();
      continue;
    }

    const packages = [...line.matchAll(SHARED_PACKAGE_PATTERN)].map((match) => match[1]);
    if (packages.length === 0) {
      flush();
      continue;
    }
    current.push(...packages);
  }
  flush();
  return recipes;
}

function sharedPackageDependencies() {
  const packagesDirectory = repoPath('packages');
  return new Map(
    readdirSync(packagesDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('shared-'))
      .map((entry) => {
        const manifest = JSON.parse(
          readFileSync(repoPath('packages', entry.name, 'package.json'), 'utf8'),
        );
        const dependencies = Object.keys(manifest.dependencies ?? {})
          .filter((name) => name.startsWith(SHARED_PACKAGE_PREFIX))
          .map((name) => name.slice('@claw/'.length));
        return [entry.name, dependencies];
      }),
  );
}

test('clean-build recipes follow the shared-package dependency graph', () => {
  const sources = [
    repoPath('package.json'),
    repoPath('.github', 'workflows', 'ci.yml'),
    repoPath('.github', 'workflows', 'lighthouse.yml'),
    ...listDockerfiles(repoPath('apps')),
  ];
  const dependencies = sharedPackageDependencies();
  const violations = [];
  let recipeCount = 0;

  for (const path of sources) {
    const recipes = extractBuildRecipes(readFileSync(path, 'utf8'));
    recipeCount += recipes.length;

    recipes.forEach((recipe, recipeIndex) => {
      const positions = new Map(recipe.map((packageName, index) => [packageName, index]));
      for (const packageName of recipe) {
        for (const dependency of dependencies.get(packageName) ?? []) {
          const dependencyPosition = positions.get(dependency);
          const packagePosition = positions.get(packageName);
          if (dependencyPosition === undefined) {
            violations.push(
              `${relative(repoPath(), path)} recipe ${recipeIndex + 1}: ` +
                `${packageName} is built without ${dependency}`,
            );
          } else if (packagePosition !== undefined && dependencyPosition > packagePosition) {
            violations.push(
              `${relative(repoPath(), path)} recipe ${recipeIndex + 1}: ` +
                `${packageName} is built before ${dependency}`,
            );
          }
        }
      }
    });
  }

  assert.ok(recipeCount >= 40, `expected at least 40 clean-build recipes, found ${recipeCount}`);
  assert.deepEqual(
    violations,
    [],
    `non-topological shared-package build recipes:\n  ${violations.join('\n  ')}`,
  );
});
