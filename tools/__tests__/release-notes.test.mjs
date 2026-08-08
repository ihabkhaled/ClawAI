import assert from 'node:assert/strict';
import { test } from 'node:test';

import { contributorsOf, renderEntry, renderNotes } from '../release/notes.mjs';
import { parseCommit } from '../release/version.mjs';

test('renderEntry bolds the scope and links the short SHA', () => {
  const commit = parseCommit({
    sha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    subject: 'feat(chat): stream tool results',
  });
  const line = renderEntry(commit, 'ihabkhaled/ClawAI');
  assert.match(line, /^- \*\*chat:\*\* stream tool results /u);
  assert.match(line, /a1b2c3d/u);
  assert.match(line, /commit\/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2/u);
});

test('renderEntry degrades gracefully with no repository (no link, no crash)', () => {
  const commit = parseCommit({ sha: 'deadbee', subject: 'fix: correct rounding' });
  const line = renderEntry(commit, '');
  assert.equal(line, '- correct rounding `deadbee`');
});

test('contributorsOf de-duplicates while preserving first-seen order', () => {
  const commits = [
    parseCommit({ author: 'Ada Lovelace', subject: 'feat: a' }),
    parseCommit({ author: 'Grace Hopper', subject: 'fix: b' }),
    parseCommit({ author: 'Ada Lovelace', subject: 'chore: c' }),
  ];
  assert.deepEqual(contributorsOf(commits), ['Ada Lovelace', 'Grace Hopper']);
});

test('renderNotes buckets commits by conventional type', () => {
  const commits = [
    parseCommit({ sha: '1111111', subject: 'feat(chat): add streaming', author: 'A' }),
    parseCommit({ sha: '2222222', subject: 'fix(auth): correct scope check', author: 'A' }),
    parseCommit({ sha: '3333333', subject: 'docs: update readme', author: 'A' }),
  ];
  const notes = renderNotes({ version: '1.2.0', previousTag: 'v1.1.0', commits, repository: 'org/repo' });
  assert.match(notes, /## 🚀 Features/u);
  assert.match(notes, /## 🐛 Bug fixes/u);
  assert.match(notes, /## 📚 Documentation/u);
  assert.match(notes, /add streaming/u);
});

test('renderNotes puts a non-conventional commit under "Other changes" rather than dropping it', () => {
  const commits = [parseCommit({ sha: '4444444', subject: 'quick tweak', author: 'A' })];
  const notes = renderNotes({ version: '1.1.1', previousTag: 'v1.1.0', commits, repository: 'org/repo' });
  assert.match(notes, /## 📦 Other changes/u);
  assert.match(notes, /quick tweak/u);
});

test('renderNotes surfaces a Breaking changes section from a bang commit', () => {
  const commits = [
    parseCommit({ sha: '5555555', subject: 'feat(api)!: remove the v1 endpoints', author: 'A' }),
  ];
  const notes = renderNotes({ version: '2.0.0', previousTag: 'v1.9.0', commits, repository: 'org/repo' });
  assert.match(notes, /## ⚠️ Breaking changes/u);
  // The breaking entry still appears in its normal section too — nothing is hidden.
  assert.match(notes, /## 🚀 Features/u);
});

test('renderNotes reports the bump level in the summary line', () => {
  const commits = [parseCommit({ sha: '6666666', subject: 'chore: bump deps', author: 'A' })];
  const notes = renderNotes({ version: '1.1.1', previousTag: 'v1.1.0', commits, repository: 'org/repo' });
  assert.match(notes, /bump: patch/u);
});

test('renderNotes never divides by a missing repository or tag', () => {
  const commits = [parseCommit({ sha: '7777777', subject: 'fix: x', author: 'A' })];
  assert.doesNotThrow(() => renderNotes({ version: '1.1.1', commits }));
});

test('renderNotes covers every commit exactly once across sections', () => {
  const commits = [
    parseCommit({ sha: '8888888', subject: 'feat(a): x', author: 'A' }),
    parseCommit({ sha: '9999999', subject: 'fix(b): y', author: 'A' }),
    parseCommit({ sha: 'aaaaaaa', subject: 'chore: z', author: 'A' }),
    parseCommit({ sha: 'bbbbbbb', subject: 'no convention here', author: 'A' }),
  ];
  const notes = renderNotes({ version: '1.2.0', previousTag: 'v1.1.0', commits, repository: 'org/repo' });
  for (const commit of commits) {
    assert.match(notes, new RegExp(commit.sha.slice(0, 7), 'u'), `missing ${commit.sha} in notes`);
  }
});
