import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

import {
  changedLineCoverage,
  normalizeLcov,
  parseDiff,
  parseLcov,
  unmeasuredFiles,
} from '../coverage/changed-lines.mjs';
import {
  configThresholds,
  parseThresholds,
  ratchetViolations,
  raisedFloors,
  readTable,
  thresholdFlags,
} from '../coverage/thresholds.mjs';
import { excessWarnings, summarise } from '../lint/ratchet.mjs';
import { repoPath } from '../lib/repo.mjs';
import { auditViolations, blockingAdvisories } from '../security/npm-audit.mjs';
import { partitionFindings, sarifFindings } from '../security/sarif-gate.mjs';
import { supportsStagedScan } from '../gates/secret-scan.mjs';

const full = { branches: 80, functions: 90, lines: 90, statements: 90 };

test('vitest thresholds parse from both the JSON-ish and the object-literal form', () => {
  assert.deepEqual(parseThresholds('thresholds: {"branches":80,"functions":90,"lines":90,"statements":90},'), full);
  assert.deepEqual(parseThresholds('thresholds: { branches: 80, functions: 90, lines: 90, statements: 90 }'), full);
  assert.equal(parseThresholds('thresholds: { lines: 90 }'), null, 'all four metrics or nothing');
  assert.equal(parseThresholds('no coverage here'), null);
});

test('every workspace config parses and the committed table passes its own ratchet', () => {
  const configs = configThresholds();
  assert.ok(Object.keys(configs).length >= 20);
  const table = readTable(JSON.parse(readFileSync(repoPath('tools/coverage/thresholds.json'), 'utf8')));
  assert.deepEqual(ratchetViolations(configs, table), []);
});

test('the coverage ratchet never lets a number go down', () => {
  const table = readTable({ workspaces: { a: full }, floors: { a: { ...full, lines: 70 } } });
  assert.deepEqual(ratchetViolations({ a: full }, table), []);

  const lowerConfig = ratchetViolations({ a: { ...full, lines: 85 } }, table);
  assert.match(lowerConfig.join('\n'), /vitest config lines 85 is below the recorded 90/u);

  const floorAboveTarget = readTable({ workspaces: { a: full }, floors: { a: { ...full, lines: 95 } } });
  assert.match(ratchetViolations({ a: full }, floorAboveTarget).join('\n'), /exceeds the declared/u);

  const base = readTable({ workspaces: { a: full }, floors: { a: { ...full, lines: 75 } }, changedLines: 85 });
  const errors = ratchetViolations({ a: full }, table, base).join('\n');
  assert.match(errors, /floor lines lowered from 75 to 70/u);
  assert.match(errors, /changedLines lowered from 85 to 80/u);
});

test('floors rise to the target once met, keep a margin below it, and never fall', () => {
  const measured = { a: { branches: { pct: 85 }, functions: { pct: 60.7 }, lines: { pct: 90 }, statements: { pct: 12.2 } } };
  const floors = raisedFloors(readTable({ floors: { a: { ...full, statements: 30, functions: 0, branches: 0, lines: 0 } } }), { a: full }, measured);
  assert.deepEqual(floors.a, { branches: 80, functions: 59, lines: 90, statements: 30 });
  assert.deepEqual(thresholdFlags(floors.a), [
    '--coverage.thresholds.branches=80',
    '--coverage.thresholds.functions=59',
    '--coverage.thresholds.lines=90',
    '--coverage.thresholds.statements=30',
  ]);
});

test('changed-lines coverage counts only instrumented lines of changed source', () => {
  const diff = [
    '+++ b/apps/claw-x/src/a.ts',
    '@@ -1,0 +10,3 @@',
    '+++ b/apps/claw-x/src/__tests__/a.spec.ts',
    '@@ -1,0 +1,5 @@',
    '+++ b/docs/readme.md',
    '@@ -1,0 +1,2 @@',
    '+++ /dev/null',
  ].join('\n');
  const changed = parseDiff(diff);
  assert.deepEqual([...changed.keys()], ['apps/claw-x/src/a.ts']);
  assert.deepEqual([...changed.get('apps/claw-x/src/a.ts')], [10, 11, 12]);

  const lcov = normalizeLcov('SF:src/a.ts\nDA:10,3\nDA:11,0\nend_of_record\n', 'apps/claw-x');
  assert.match(lcov, /^SF:apps\/claw-x\/src\/a\.ts$/mu);
  const result = changedLineCoverage(changed, parseLcov(lcov));
  assert.deepEqual(
    { total: result.total, covered: result.covered, uncovered: result.uncovered },
    { total: 2, covered: 1, uncovered: ['apps/claw-x/src/a.ts:11'] },
    'line 12 has no DA record (not instrumented) and does not count',
  );
  assert.deepEqual(unmeasuredFiles(new Map([['apps/y/src/b.ts', new Set([1])]]), parseLcov(lcov)), ['apps/y/src/b.ts']);
});

test('the lint ratchet fails errors and warnings above the baseline, not the backlog', () => {
  const { errors, warnings } = summarise([
    {
      filePath: repoPath('apps/claw-x/src/a.ts'),
      messages: [
        { severity: 1, ruleId: 'sort-imports', line: 1, column: 1, message: 'x' },
        { severity: 1, ruleId: 'sort-imports', line: 2, column: 1, message: 'x' },
        { severity: 2, ruleId: 'eqeqeq', line: 3, column: 1, message: 'use ===' },
      ],
    },
  ]);
  assert.equal(errors.length, 1);
  assert.deepEqual(warnings, { 'apps/claw-x/src/a.ts': { 'sort-imports': 2 } });
  assert.deepEqual(excessWarnings(warnings, { 'apps/claw-x/src/a.ts': { 'sort-imports': 2 } }), []);
  assert.deepEqual(excessWarnings(warnings, { 'apps/claw-x/src/a.ts': { 'sort-imports': 1 } }), [
    'apps/claw-x/src/a.ts: sort-imports 2 (baseline 1)',
  ]);
  assert.equal(excessWarnings(warnings, {}).length, 1, 'a file with no baseline entry has no allowance');
});

test('npm audit fails unreviewed or expired high/critical advisories only', () => {
  const report = {
    vulnerabilities: {
      deep: { via: [{ severity: 'high', title: 'boom', url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc' }] },
      prisma: { via: ['deep'] },
      minor: { via: [{ severity: 'moderate', title: 'meh', url: 'https://github.com/advisories/GHSA-zzzz-zzzz-zzzz' }] },
    },
  };
  const advisories = blockingAdvisories(report);
  assert.deepEqual([...advisories.keys()], ['GHSA-aaaa-bbbb-cccc']);
  assert.equal(auditViolations(advisories, {}).length, 1);
  const allowed = { 'GHSA-aaaa-bbbb-cccc': { reason: 'r', reviewedBy: 'x', expires: '2099-01-01' } };
  assert.deepEqual(auditViolations(advisories, allowed, '2026-10-13'), []);
  assert.match(auditViolations(advisories, allowed, '2100-01-01').join(), /expired/u);
  assert.match(auditViolations(new Map(), { X: { reason: 'r' } }).join(), /needs reason, reviewedBy and expires/u);
});

test('the committed audit allowlist entries are complete and unexpired', () => {
  const allowlist = JSON.parse(readFileSync(repoPath('tools/security/audit-allowlist.json'), 'utf8')).advisories;
  const errors = auditViolations(new Map(Object.keys(allowlist).map((id) => [id, { severity: 'high', title: id, packages: new Set() }])), allowlist);
  assert.deepEqual(errors, []);
});

test('CodeQL findings fail unless accepted by rule and path', () => {
  const findings = sarifFindings({
    runs: [
      {
        results: [
          { ruleId: 'js/sql-injection', message: { text: 'bad' }, locations: [{ physicalLocation: { artifactLocation: { uri: 'apps/a.ts' }, region: { startLine: 4 } } }] },
          { ruleId: 'js/request-forgery', message: { text: 'fp' }, locations: [{ physicalLocation: { artifactLocation: { uri: 'packages/b.ts' } } }] },
          { ruleId: 'js/x', suppressions: [{ kind: 'inSource' }] },
        ],
      },
    ],
  });
  assert.equal(findings.length, 2, 'suppressed results are reviewed decisions');
  const { blocking, known } = partitionFindings(findings, [{ rule: 'js/request-forgery', path: 'packages/b.ts' }]);
  assert.deepEqual(blocking.map((f) => f.rule), ['js/sql-injection']);
  assert.deepEqual(known.map((f) => f.rule), ['js/request-forgery']);
});

test('lint-staged never spawns a tool through an npm .cmd shim, and skips generated docs', () => {
  // A .cmd shim goes through cmd.exe, whose 8191-character cap (after it
  // escapes every argument) failed a 270-file docs commit on 2026-10-13.
  const require = createRequire(import.meta.url);
  for (const config of ['.lintstagedrc.cjs', 'apps/claw-frontend/.lintstagedrc.cjs']) {
    const rules = require(repoPath(config));
    const docs = rules['*.{ts,tsx,js,jsx,json,css,md,yml,yaml}']([
      repoPath('apps/claw-frontend/AGENTS.md'),
      repoPath('apps/claw-frontend/README.md'),
    ]);
    assert.ok(docs.length > 0, config);
    for (const command of docs) {
      assert.match(command, /^node \S+prettier\.cjs --write /u, `${config}: ${command.slice(0, 60)}`);
      assert.doesNotMatch(command, /AGENTS\.md/u, `${config} must not format a generated AGENTS.md`);
    }
  }
});

test('the secret scan uses the staged git mode on gitleaks 8.19 and later', () => {
  assert.equal(supportsStagedScan('8.30.1'), true);
  assert.equal(supportsStagedScan('8.19.0'), true);
  assert.equal(supportsStagedScan('8.18.4'), false);
  assert.equal(supportsStagedScan('9.0.0'), true);
  const hook = readFileSync(repoPath('.husky/pre-commit'), 'utf8');
  assert.match(hook, /node tools\/gates\/secret-scan\.mjs/u);
});
