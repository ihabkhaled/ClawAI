import assert from 'node:assert/strict';
import test from 'node:test';

import { GIT_MAX_BUFFER_BYTES, git, gitLines } from '../lib/git.mjs';

test('the git helper reads output far larger than node default 1 MiB limit', () => {
  assert.ok(GIT_MAX_BUFFER_BYTES >= 64 * 1024 * 1024);
  // `git ls-files` is over 1 MiB in this repo; it must not throw ENOBUFS.
  assert.ok(gitLines(['ls-files']).length > 1000);
  assert.ok(git(['ls-files']).length > 0);
});
