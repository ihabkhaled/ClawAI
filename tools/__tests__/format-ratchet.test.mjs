import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  buildFormattingBaseline,
  evaluateFormattingDebt,
  formattingContentHash,
} from '../format/ratchet.mjs';
import { readJson, readText, repoPath } from '../lib/repo.mjs';

const BAD_SOURCE = 'const value={answer:42};\n';
const FORMATTED_SOURCE = 'const value = { answer: 42 };\n';

test('unchanged legacy formatting debt is accepted by its normalized content hash', () => {
  const baseline = { 'src/legacy.ts': formattingContentHash(BAD_SOURCE) };
  const result = evaluateFormattingDebt(
    [{ path: 'src/legacy.ts', source: BAD_SOURCE, formatted: FORMATTED_SOURCE }],
    baseline,
  );

  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.legacy, ['src/legacy.ts']);
});

test('modified legacy formatting debt is rejected until formatted', () => {
  const baseline = { 'src/legacy.ts': formattingContentHash(BAD_SOURCE) };
  const modifiedSource = 'const value={answer:43};\n';
  const result = evaluateFormattingDebt(
    [{ path: 'src/legacy.ts', source: modifiedSource, formatted: FORMATTED_SOURCE }],
    baseline,
  );

  assert.deepEqual(result.failures, ['src/legacy.ts']);
});

test('new formatting debt is rejected', () => {
  const result = evaluateFormattingDebt(
    [{ path: 'src/new.ts', source: BAD_SOURCE, formatted: FORMATTED_SOURCE }],
    {},
  );

  assert.deepEqual(result.failures, ['src/new.ts']);
});

test('formatted legacy files pass even while their old baseline entry exists', () => {
  const baseline = { 'src/legacy.ts': formattingContentHash(BAD_SOURCE) };
  const result = evaluateFormattingDebt(
    [{ path: 'src/legacy.ts', source: FORMATTED_SOURCE, formatted: FORMATTED_SOURCE }],
    baseline,
  );

  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.clean, ['src/legacy.ts']);
});

test('line-ending differences do not create platform-specific formatting debt', () => {
  const result = evaluateFormattingDebt(
    [{ path: 'src/clean.ts', source: 'const value = 1;\r\n', formatted: 'const value = 1;\n' }],
    {},
  );

  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.clean, ['src/clean.ts']);
});

test('baseline generation is deterministic and default refresh cannot bless new debt', () => {
  const candidates = [
    { path: 'src/z.ts', source: 'const z=1;\n', formatted: 'const z = 1;\n' },
    { path: 'src/a.ts', source: 'const a=1;\n', formatted: 'const a = 1;\n' },
  ];
  const existing = { 'src/z.ts': formattingContentHash('const z=1;\n') };

  assert.deepEqual(buildFormattingBaseline(candidates, existing), existing);
  assert.deepEqual(buildFormattingBaseline(candidates, {}, { bootstrap: true }), {
    'src/a.ts': formattingContentHash('const a=1;\n'),
    'src/z.ts': formattingContentHash('const z=1;\n'),
  });
});

test('root scripts wire the ratchet into release preflight and use cross-platform EOL', () => {
  const rootPackage = readJson(repoPath('package.json'));
  const prettierConfig = readJson(repoPath('.prettierrc'));
  const preflight = readText(repoPath('tools', 'release', 'preflight.mjs'));

  assert.equal(rootPackage.scripts['format:check'], 'node tools/format/ratchet.mjs check');
  assert.equal(rootPackage.scripts['format:baseline'], 'node tools/format/ratchet.mjs baseline');
  assert.equal(prettierConfig.endOfLine, 'auto');
  assert.match(preflight, /\['Format check', 'npm run format:check'\]/u);
});
