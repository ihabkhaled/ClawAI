import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deadFormatEntries,
  deadLintEntries,
  formattingContentHash,
  lintStagedCovers,
} from '../gates/autosync.mjs';
import { isDerivedPath, pushRanges } from '../gates/self-heal.mjs';
import {
  allowlistTemplate,
  chooseFix,
  keepWorkspaceVersions,
  remediationTargets,
  withDirectRange,
  withOverride,
} from '../security/audit-fix.mjs';

const report = (vulnerabilities) => ({ vulnerabilities });
const via = (name, severity, id, range) => ({
  name,
  severity,
  url: `https://github.com/advisories/${id}`,
  range,
  title: id,
});

test('format baseline: deleted files and changed bytes are pruned, untouched entries kept', () => {
  const same = 'a\n';
  const violations = {
    'kept.md': formattingContentHash(same),
    'gone.md': 'x',
    'edited.md': formattingContentHash('old'),
  };
  const blobs = { 'kept.md': same, 'edited.md': 'new' };
  const dead = deadFormatEntries(violations, {
    inIndex: (p) => p !== 'gone.md',
    stagedBlob: (p) => blobs[p] ?? null,
  });
  assert.deepEqual(dead, ['edited.md', 'gone.md']);
});

test('format hash ignores CRLF vs LF', () => {
  assert.equal(formattingContentHash('a\r\nb'), formattingContentHash('a\nb'));
});

test('lint baseline: only linted staged files and deleted files are pruned', () => {
  const warnings = {
    'apps/a/x.ts': {},
    'apps/a/y.ts': {},
    'agent-cli/z.js': {},
    'apps/a/gone.ts': {},
  };
  const dead = deadLintEntries(warnings, {
    staged: ['apps/a/x.ts', 'agent-cli/z.js'],
    inIndex: (p) => p !== 'apps/a/gone.ts',
    lintStagedCovers,
  });
  assert.deepEqual(dead, ['apps/a/gone.ts', 'apps/a/x.ts']);
  assert.equal(lintStagedCovers('AGENTS.md'), false);
});

test('only blocking, un-allowlisted (or expired) advisories become remediation targets', () => {
  const r = report({
    a: {
      isDirect: false,
      via: [
        via('a', 'high', 'GHSA-aaaa-aaaa-aaaa', '<2.0.0'),
        via('a', 'moderate', 'GHSA-mmmm-mmmm-mmmm', '<2.5.0'),
      ],
    },
    b: { isDirect: true, via: [via('b', 'high', 'GHSA-bbbb-bbbb-bbbb', '<1.0.0')] },
    c: { isDirect: false, via: [via('c', 'moderate', 'GHSA-cccc-cccc-cccc', '<1.0.0')] },
    d: { isDirect: false, via: ['a'] },
  });
  const allowlist = { 'GHSA-bbbb-bbbb-bbbb': { expires: '2099-01-01' } };
  const targets = remediationTargets(r, allowlist, '2026-10-31');
  assert.deepEqual([...targets.keys()], ['a']);
  assert.deepEqual(targets.get('a').allRanges, ['<2.0.0', '<2.5.0']);
  const expired = remediationTargets(
    r,
    { 'GHSA-bbbb-bbbb-bbbb': { expires: '2026-01-01' } },
    '2026-10-31',
  );
  assert.ok(expired.has('b'), 'an expired allowlist entry fails again');
});

test('chooseFix: lowest patched major, highest release in it, no prereleases, never below current', () => {
  const versions = ['6.3.0', '6.4.0', '10.3.0', '10.7.4', '10.7.5', '11.0.0', '12.0.0-beta.1'];
  const fix = chooseFix({
    versions,
    current: '6.4.0',
    blockingRanges: ['<=10.3.0'],
    allRanges: ['<=10.3.0', '<=10.7.3'],
  });
  assert.deepEqual(fix, { version: '10.7.5', major: 10, crossesMajor: true });
  const sameMajor = chooseFix({
    versions: ['1.16.1', '1.16.2'],
    current: '1.16.1',
    blockingRanges: ['>=1.16.0 <=1.16.1'],
    allRanges: ['>=1.16.0 <=1.16.1'],
  });
  assert.equal(sameMajor.version, '1.16.2');
  assert.equal(sameMajor.crossesMajor, false);
});

test('chooseFix falls back to the blocking ranges when a moderate one has no fix, and returns null with no patch', () => {
  const fallback = chooseFix({
    versions: ['1.0.0', '1.1.0'],
    current: '1.0.0',
    blockingRanges: ['<1.1.0'],
    allRanges: ['<1.1.0', '>=1.1.0'],
  });
  assert.equal(fallback.version, '1.1.0');
  assert.equal(
    chooseFix({
      versions: ['1.0.0'],
      current: '1.0.0',
      blockingRanges: ['<=1.0.0'],
      allRanges: ['<=1.0.0'],
    }),
    null,
  );
});

test('no patch: the allowlist template carries the required fields and a 30 day expiry', () => {
  const { id, entry } = allowlistTemplate(
    { name: 'x', ids: ['GHSA-xxxx-xxxx-xxxx'], blockingRanges: ['<=1.0.0'] },
    new Date('2026-10-31T00:00:00Z'),
  );
  assert.equal(id, 'GHSA-xxxx-xxxx-xxxx');
  assert.equal(entry.expires, '2026-11-30');
  for (const key of ['reason', 'reviewedBy', 'expires', 'package']) assert.ok(entry[key]);
});

test('package.json edits keep format and EOL, and refuse a file they could not round-trip', () => {
  const text = '{\n  "name": "x",\n  "overrides": {\n    "a": "^1.0.0"\n  }\n}\n';
  assert.equal(withOverride(text, 'a', '^1.2.0'), text.replace('^1.0.0', '^1.2.0'));
  assert.match(withOverride(text, 'b', '^2.0.0'), /"b": "\^2.0.0"/u);
  const crlf = text.replace(/\n/gu, '\r\n');
  assert.equal(withOverride(crlf, 'a', '^1.2.0'), crlf.replace('^1.0.0', '^1.2.0'));
  assert.equal(withOverride('{"name":"x"}', 'a', '^1.0.0'), null);
  const direct = '{\n  "dependencies": {\n    "d": "^1.0.0"\n  }\n}\n';
  assert.match(withDirectRange(direct, 'd', '^1.5.0'), /"d": "\^1.5.0"/u);
  assert.equal(withDirectRange(direct, 'nope', '^1.0.0'), null);
});

test('lockfile regeneration keeps workspace versions but keeps dependency edits', () => {
  const previous = {
    version: '1.0.0',
    packages: {
      '': { version: '1.0.0' },
      'apps/a': { version: '1.0.0' },
      'node_modules/x': { version: '1.0.0' },
    },
  };
  const next = {
    version: '2.0.0',
    packages: {
      '': { version: '2.0.0' },
      'apps/a': { version: '2.0.0', dependencies: { y: '1' } },
      'node_modules/x': { version: '1.0.1' },
    },
  };
  const out = keepWorkspaceVersions(previous, next);
  assert.equal(out.packages['apps/a'].version, '1.0.0');
  assert.deepEqual(out.packages['apps/a'].dependencies, { y: '1' });
  assert.equal(out.packages['node_modules/x'].version, '1.0.1');
  assert.equal(out.version, '1.0.0');
});

test('pre-push self-heal commits only derived paths and ranges follow the remote sha', () => {
  const fragments = new Set(['docs/a.md']);
  for (const ok of [
    '.ai/manifests/x.json',
    'AGENTS.md',
    'apps/claw-x/AGENTS.md',
    'docs/a.md',
    'docs/features/ai-native-engineering-os/inventory.snapshot.json',
  ]) {
    assert.ok(isDerivedPath(ok, fragments), ok);
  }
  for (const bad of ['docs/b.md', 'apps/claw-x/src/a.ts', 'package.json'])
    assert.ok(!isDerivedPath(bad, fragments), bad);
  const zero = '0'.repeat(40);
  assert.deepEqual(pushRanges([{ localSha: 'abc', remoteSha: zero }], 'origin/main'), [
    'origin/main..abc',
  ]);
});
