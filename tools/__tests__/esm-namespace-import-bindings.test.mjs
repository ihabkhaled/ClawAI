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

// Both quote styles: the three Mongo health services that this guard exists to
// catch are written with double quotes, and a single-quote-only pattern silently
// scanned past every one of them.
const NAMESPACE_IMPORT = /import \* as ([A-Za-z_$][\w$]*) from ['"]([^'"]+)['"]/gu;
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

// Specs are excluded on purpose: ts-jest transpiles them to CommonJS, so ESM
// linking rules never apply to them, and they legitimately import test-only
// packages (@jest/globals) that refuse to load outside a Jest run.
function isTestFile(path) {
  return /[\\/]__tests__[\\/]|\.spec\.|\.test\./u.test(path);
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' || entry.name === 'dist' ? [] : sourceFiles(path);
    }
    if (!path.endsWith('.ts') && !path.endsWith('.tsx')) {
      return [];
    }
    return isTestFile(path) ? [] : [path];
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

// The same ESM trap, in its NAMED-import form.
//
// `import { Connection } from 'mongoose'` is a link-time error under ESM when
// cjs-module-lexer did not detect that export — Node throws
// `SyntaxError: The requested module 'mongoose' does not provide an export
// named 'Connection'` before a single line runs. mongoose exposes `Model` and
// `Schema` but NOT `Connection`, so it is per-name, not per-package.
//
// This took audit-service, client-logs-service and server-logs-service down on
// 2026-09-02. In all three the name was used only as a type, on an
// `@InjectConnection()` constructor parameter — but `emitDecoratorMetadata`
// emits the binding into `design:paramtypes`, so tsgo kept the runtime import.
// Writing `import type { Connection }` elides it and the metadata becomes
// `Object`, which is what the explicit Nest token was providing anyway.
//
// The check is deliberately narrow: only names used as a CONSTRUCTOR PARAMETER
// type. tsgo elides a type-only import everywhere else — `implements
// ExceptionFilter`, a method parameter, a generic argument — so flagging those
// would report hundreds of lines that work correctly today. A constructor
// parameter inside a decorated class is the one position where the import
// survives into the emitted JS even though the source only mentions it as a
// type, because `emitDecoratorMetadata` writes it into `design:paramtypes`.
// That is precisely the shape that broke the three Mongo services.
const NAMED_IMPORT = /import \{([^}]*)\} from ['"]([^'"]+)['"]/gu;
const CONSTRUCTOR_BLOCK = /constructor\s*\(([\s\S]*?)\)\s*\{/gu;

function constructorParameterTypes(source) {
  const names = new Set();
  for (const block of source.matchAll(CONSTRUCTOR_BLOCK)) {
    for (const parameter of block[1].matchAll(/:\s*([A-Za-z_$][\w$]*)/gu)) {
      names.add(parameter[1]);
    }
  }
  return names;
}

function valueSpecifiers(clause) {
  return clause
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith('type '))
    .map((part) => part.split(/\s+as\s+/u)[0].trim())
    .filter((name) => /^[A-Za-z_$][\w$]*$/u.test(name));
}

test('constructor-parameter types imported from a CJS package survive ESM linking', async () => {
  const violations = [];
  let checkedNames = 0;

  for (const workspace of esmWorkspaces()) {
    const source = join(workspace, 'src');
    if (!existsSync(source)) {
      continue;
    }
    for (const file of sourceFiles(source)) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(NAMED_IMPORT)) {
        const [, clause, specifier] = match;
        if (SKIPPED_PREFIXES.some((prefix) => specifier.startsWith(prefix))) {
          continue;
        }
        if (!existsSync(repoPath('node_modules', packageRoot(specifier), 'package.json'))) {
          continue;
        }
        const constructorTypes = constructorParameterTypes(text);
        const names = valueSpecifiers(clause).filter((name) => constructorTypes.has(name));
        if (names.length === 0) {
          continue;
        }
        const namespace = await import(specifier);
        for (const name of names) {
          checkedNames += 1;
          // Missing from the namespace is not enough. A name absent from BOTH
          // the namespace and `.default` is a pure type (`ZodSchema`,
          // `PipeTransform`); tsgo knows it is not a value, emits `Object` into
          // the metadata and drops the import entirely, so nothing can fail.
          // The dangerous case is a name that IS a runtime value — a class like
          // mongoose's `Connection` — which the CJS lexer failed to re-export.
          // Then tsgo emits a real import and Node rejects the link.
          const isRuntimeValue = namespace.default?.[name] !== undefined;
          if (namespace[name] === undefined && isRuntimeValue) {
            violations.push(
              `${relative(repoPath(), file)}: '${specifier}' has no export '${name}' under ESM ` +
                `(Node throws at link time). Use \`import type { ${name} }\` if it is only a type.`,
            );
          }
        }
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `named imports that break under ESM:\n  ${violations.join('\n  ')}`,
  );
  assert.ok(checkedNames > 0, 'checked no named imports — the scanner is not guarding anything');
});
