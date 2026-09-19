import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Two tracked paths that differ only by case are one file on Windows and
// macOS. Git then compares both index entries to that single file and reports
// one of them as modified forever. A wiki consolidation on 2026-09-19 tracked
// seven pages twice (Package-Shared-Auth.md and Package-shared-auth.md): the
// tree never looked clean, and the GitHub wiki would have had two pages for one
// name.
test('no two tracked paths differ only by case', () => {
  const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((path) => path.length > 0);
  const byLower = new Map();
  for (const path of paths) {
    const key = path.toLowerCase();
    byLower.set(key, [...(byLower.get(key) ?? []), path]);
  }
  const collisions = [...byLower.values()].filter((group) => group.length > 1);
  assert.deepEqual(
    collisions,
    [],
    `paths that collide on a case-insensitive disk: ${JSON.stringify(collisions)}`,
  );
});
