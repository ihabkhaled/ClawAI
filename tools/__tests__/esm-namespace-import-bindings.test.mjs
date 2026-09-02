// Every workspace is `"type": "module"`, so `import * as x from '<cjs-package>'`
// does NOT give you `module.exports`. Node builds the namespace from whatever
// cjs-module-lexer could statically detect, and puts the real `module.exports`
// on `.default`.
//
// Whether that is safe is per-package, not a blanket rule:
//   argon2       → lexer finds hash/verify/argon2id     → namespace import fine
//   jsonwebtoken → lexer finds `decode` only            → `jwt.verify` undefined
//
// On 2026-09-02 the second one took production down: `verifyAccessToken` threw
// "jwt.verify is not a function" on every request, so every authenticated call
// 401'd and login could not issue a token. It was invisible to CI because
// ts-jest transpiles specs to CommonJS, where `import * as jwt` DOES give
// module.exports — the unit tests passed against a module shape production
// never uses.
//
// So this test does not read the source and guess. For each namespace import of
// a third-party package in an ESM workspace, it imports that package as real
// ESM and asserts every member the source CALLS actually exists on the
// namespace. Call position only (`x.member(`, `new x.member(`), because
// type-only members (`jwt.JwtPayload`) legitimately have no runtime binding.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

import { repoPath } from '../lib/repo.mjs';

const NAMESPACE_IMPORT = /import \* as ([A-Za-z_$][\w$]*) from '([^']+)'/gu;
const SKIPPED_PREFIXES = ['node:', '.', '@claw/', '@app/', '@common/', '@modules/', '@infrastructure/'];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isEsmWorkspace(workspace) {
  const manifest = join(workspace, 'package.json');
  return existsSync(manifest) && readJson(manifest).type === 'module';
}

function esmWorkspaces() {
  return ['apps', 'packages']
    .flatMap((group) =>
      readdirSync(repoPath(group), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => repoPath(group, entry.name)),
    )
    .filter((workspace) => statSync(workspace).isDirectory() && isEsmWorkspace(workspace));
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' || entry.name === 'dist' ? [] : sourceFiles(path);
    }
    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : [];
  });
}

function packageRoot(specifier) {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
}

// Members used as values: `jwt.verify(...)` or `new jwt.JsonWebTokenError(...)`.
// Type-only members are deliberately not collected — they have no runtime binding.
function calledMembers(source, localName) {
  const pattern = new RegExp(`\\b${localName}\\.([A-Za-z_$][\\w$]*)\\s*\\(`, 'gu');
  return new Set([...source.matchAll(pattern)].map((match) => match[1]));
}

function collectNamespaceImports() {
  const found = [];
  for (const workspace of esmWorkspaces()) {
    const source = join(workspace, 'src');
    if (!existsSync(source)) {
      continue;
    }
    for (const file of sourceFiles(source)) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(NAMESPACE_IMPORT)) {
        const [, localName, specifier] = match;
        if (SKIPPED_PREFIXES.some((prefix) => specifier.startsWith(prefix))) {
          continue;
        }
        found.push({ file, specifier, members: calledMembers(text, localName) });
      }
    }
  }
  return found;
}

test('namespace imports of third-party packages expose every member the source calls', async () => {
  const imports = collectNamespaceImports();
  const violations = [];
  let checkedMembers = 0;

  for (const { file, specifier, members } of imports) {
    if (members.size === 0) {
      continue;
    }
    if (!existsSync(repoPath('node_modules', packageRoot(specifier), 'package.json'))) {
      violations.push(`${relative(repoPath(), file)}: cannot resolve '${specifier}' to verify it`);
      continue;
    }

    const namespace = await import(specifier);
    for (const member of members) {
      checkedMembers += 1;
      if (namespace[member] === undefined) {
        violations.push(
          `${relative(repoPath(), file)}: '${specifier}' namespace has no '${member}' under ESM ` +
            `(it is on .default). Use a default import: import ${packageRoot(specifier)} from '${specifier}'`,
        );
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `namespace imports that break under ESM:\n  ${violations.join('\n  ')}`,
  );
  assert.ok(
    checkedMembers > 0,
    'checked no members — the namespace-import scanner matched nothing, so it is not guarding anything',
  );
});
