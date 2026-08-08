import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyVersion,
  bumpLevelFor,
  nextVersion,
  parseCommit,
  readCommits,
  rewriteVersions,
  versionedManifests,
} from '../release/version.mjs';
import { toRel } from '../lib/repo.mjs';

test('parseCommit reads a conventional feat commit', () => {
  const commit = parseCommit({ subject: 'feat(chat): stream tool results' });
  assert.equal(commit.type, 'feat');
  assert.equal(commit.scope, 'chat');
  assert.equal(commit.description, 'stream tool results');
  assert.equal(commit.breaking, false);
});

test('parseCommit detects a bang breaking marker', () => {
  const commit = parseCommit({ subject: 'feat(api)!: drop the v1 endpoints' });
  assert.equal(commit.breaking, true);
});

test('parseCommit detects a BREAKING CHANGE footer and extracts its note', () => {
  const commit = parseCommit({
    subject: 'refactor(auth): rework token storage',
    body: 'internal cleanup, no behaviour change\n\nBREAKING CHANGE: refresh tokens are now opaque\nand cannot be decoded client-side.\n',
  });
  assert.equal(commit.breaking, true);
  assert.equal(commit.breakingNote, 'refresh tokens are now opaque and cannot be decoded client-side.');
});

test('parseCommit treats a non-conventional subject as untyped, not an error', () => {
  const commit = parseCommit({ subject: 'wip debugging session' });
  assert.equal(commit.type, null);
  assert.equal(commit.description, 'wip debugging session');
});

test('bumpLevelFor floors at patch — an all-chore range is still releasable', () => {
  const commits = [parseCommit({ subject: 'chore: bump lockfile' })];
  assert.equal(bumpLevelFor(commits), 'patch');
});

test('bumpLevelFor floors at patch for a completely non-conventional range', () => {
  const commits = [parseCommit({ subject: 'wip' }), parseCommit({ subject: 'fixup' })];
  assert.equal(bumpLevelFor(commits), 'patch');
});

test('bumpLevelFor raises to minor on a feat commit', () => {
  const commits = [
    parseCommit({ subject: 'fix(chat): correct off-by-one' }),
    parseCommit({ subject: 'feat(chat): add streaming' }),
  ];
  assert.equal(bumpLevelFor(commits), 'minor');
});

test('bumpLevelFor raises to major on any breaking commit, even alongside feats', () => {
  const commits = [
    parseCommit({ subject: 'feat(chat): add streaming' }),
    parseCommit({ subject: 'fix(auth)!: require MFA for admin routes' }),
  ];
  assert.equal(bumpLevelFor(commits), 'major');
});

test('nextVersion patch/minor/major arithmetic', () => {
  assert.equal(nextVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(nextVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(nextVersion('1.2.3', 'major'), '2.0.0');
});

test('nextVersion resets lower segments on a minor/major bump', () => {
  assert.equal(nextVersion('4.9.9', 'minor'), '4.10.0');
  assert.equal(nextVersion('4.9.9', 'major'), '5.0.0');
});

test('nextVersion rejects a non-semver current version', () => {
  assert.throws(() => nextVersion('not-a-version', 'patch'));
});

test('rewriteVersions updates the version field only, preserving formatting', () => {
  const source = '{\n  "name": "claw",\n  "version": "1.1.0",\n  "private": true\n}\n';
  const updated = rewriteVersions(source, '1.2.0');
  assert.match(updated, /"version": "1\.2\.0"/u);
  assert.equal(updated.split('\n').length, source.split('\n').length);
});

test('rewriteVersions pins every @claw/* dependency to the new version', () => {
  const source = JSON.stringify(
    {
      name: '@claw/shared-auth',
      version: '1.1.0',
      dependencies: {
        '@claw/shared-types': '1.1.0',
        '@claw/shared-utilities': '1.1.0',
        express: '^4.19.0',
      },
    },
    null,
    2,
  );
  const updated = rewriteVersions(source, '1.2.0');
  const parsed = JSON.parse(updated);
  assert.equal(parsed.version, '1.2.0');
  assert.equal(parsed.dependencies['@claw/shared-types'], '1.2.0');
  assert.equal(parsed.dependencies['@claw/shared-utilities'], '1.2.0');
  // Third-party ranges must be left untouched.
  assert.equal(parsed.dependencies.express, '^4.19.0');
});

test('rewriteVersions leaves a wildcard @claw/* pin alone', () => {
  const source = JSON.stringify({ version: '1.1.0', dependencies: { '@claw/shared-types': '*' } });
  const updated = rewriteVersions(source, '1.2.0');
  assert.equal(JSON.parse(updated).dependencies['@claw/shared-types'], '*');
});

test('rewriteVersions is idempotent — running it twice with the same version is a no-op the second time', () => {
  const source = '{ "version": "1.1.0" }';
  const once = rewriteVersions(source, '1.2.0');
  const twice = rewriteVersions(once, '1.2.0');
  assert.equal(once, twice);
});

test('versionedManifests always includes the root package.json plus every workspace', () => {
  const manifests = versionedManifests({
    workspaces: [{ dir: 'packages/shared-types' }, { dir: 'apps/claw-auth-service' }],
  });
  assert.deepEqual(manifests, [
    'package.json',
    'packages/shared-types/package.json',
    'apps/claw-auth-service/package.json',
  ]);
});

test('applyVersion writes only the manifests whose content actually changed', () => {
  const files = {
    'package.json': '{ "version": "1.1.0" }',
    'apps/claw-auth-service/package.json': '{ "version": "1.1.0" }',
    'apps/claw-frontend/package.json': '{ "version": "1.2.0" }', // already current
  };
  const written = {};
  const changed = applyVersion('1.2.0', {
    manifests: [
      'package.json',
      'apps/claw-auth-service/package.json',
      'apps/claw-frontend/package.json',
    ],
    read: (absolute) => files[toRel(absolute)] ?? null,
    write: (absolute, content) => {
      written[toRel(absolute)] = content;
    },
  });

  assert.deepEqual(changed.sort(), ['apps/claw-auth-service/package.json', 'package.json'].sort());
  assert.equal(Object.keys(written).length, 2);
  assert.equal(written['package.json'], rewriteVersions(files['package.json'], '1.2.0'));
});

test('applyVersion silently skips a manifest that does not exist', () => {
  const changed = applyVersion('1.2.0', {
    manifests: ['package.json', 'apps/claw-ghost-service/package.json'],
    read: (absolute) => (toRel(absolute).includes('claw-ghost-service') ? null : '{ "version": "1.1.0" }'),
    write: () => {},
  });
  assert.deepEqual(changed, ['package.json']);
});

test('readCommits parses a fake git log using the injected `git` function', () => {
  const RS = String.fromCharCode(30);
  const FS = String.fromCharCode(31);
  const fakeLog =
    ['a1b2c3', 'feat(chat): add streaming', 'Ada Lovelace', ''].join(FS) +
    RS +
    '\n' +
    ['d4e5f6', 'fix(auth): correct scope check', 'Grace Hopper', ''].join(FS) +
    RS +
    '\n';

  const commits = readCommits({ from: 'v1.0.0', to: 'HEAD', git: () => fakeLog });
  assert.equal(commits.length, 2);
  assert.equal(commits[0].type, 'feat');
  assert.equal(commits[0].author, 'Ada Lovelace');
  assert.equal(commits[1].type, 'fix');
});

test('readCommits returns an empty list for an empty range without throwing', () => {
  const commits = readCommits({ from: 'v1.0.0', to: 'v1.0.0', git: () => '' });
  assert.deepEqual(commits, []);
});
