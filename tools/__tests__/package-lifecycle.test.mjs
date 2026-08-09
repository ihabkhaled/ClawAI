import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { discoverWorkspaces, readJson, readText, repoPath } from '../lib/repo.mjs';

test('repository hook installation is owned only by the root package lifecycle', () => {
  const rootPackage = readJson(repoPath('package.json'));
  const workspacePrepareScripts = discoverWorkspaces()
    .filter((workspace) => workspace.pkg.scripts?.prepare !== undefined)
    .map((workspace) => `${workspace.dir}: ${workspace.pkg.scripts.prepare}`);

  assert.equal(rootPackage.scripts.prepare, 'node .husky/install.mjs || exit 0');
  assert.deepEqual(
    workspacePrepareScripts,
    [],
    `workspace prepare scripts duplicate the root hook lifecycle:\n${workspacePrepareScripts.join('\n')}`,
  );
});

test('frontend cache cleanup does not depend on a Unix shell command', () => {
  const frontendPackage = discoverWorkspaces().find(
    (workspace) => workspace.name === 'claw-frontend',
  )?.pkg;

  assert.ok(frontendPackage, 'claw-frontend workspace is missing');
  assert.doesNotMatch(frontendPackage.scripts['clear-cache'], /\brm\s+-rf\b/u);
});

test('git hooks only restore the stash entry they created', () => {
  const sharedRestore = readText(repoPath('scripts', 'hooks', 'restore-stash.sh'));

  for (const hookName of ['pre-commit', 'pre-push']) {
    const hook = readText(repoPath('.husky', hookName));

    assert.ok(hook, `${hookName} hook is missing`);
    assert.match(hook, /STASH_BEFORE=/u, `${hookName} must record the previous stash tip`);
    assert.match(hook, /STASH_AFTER=/u, `${hookName} must inspect the new stash tip`);
    assert.match(
      hook,
      /"\$STASH_AFTER"\s*!=\s*"\$STASH_BEFORE"/u,
      `${hookName} must prove that stash push created an entry`,
    );

    // The identity guard lives wherever the restore is implemented. Both hooks
    // now delegate to one shared script, so follow the delegation rather than
    // demanding the check be inlined twice.
    const restore = /restore-stash\.sh/u.test(hook) ? sharedRestore : hook;

    assert.ok(restore, `${hookName} delegates a restore that does not exist`);
    assert.match(
      restore,
      /"\$CURRENT_STASH"\s*!?=\s*"\$STASH_REF"/u,
      `${hookName} must not pop an unrelated stash entry`,
    );
  }
});

test('a failed stash pop still returns every clean path to the tree', () => {
  const restore = readText(repoPath('scripts', 'hooks', 'restore-stash.sh'));

  assert.ok(restore, 'the shared stash restore script is missing');

  // `git stash pop` is all-or-nothing: one path dirtied while the checks ran
  // aborts the whole restore and strands everything else. That stranded
  // thirty-six files in a single push. The fallback must put back each path
  // that is still pristine, and must keep the entry so the rest stays
  // recoverable.
  assert.match(
    restore,
    /git checkout "\$STASH_REF"/u,
    'restore must fall back to a per-file checkout when the pop aborts',
  );
  assert.match(
    restore,
    /git diff --quiet -- "\$path"/u,
    'restore must skip paths that changed while the hook ran',
  );
  assert.doesNotMatch(
    restore,
    /git stash drop --quiet "\$STASH_REF"[\s\S]*git checkout "\$STASH_REF"/u,
    'restore must not drop the entry before the per-file fallback runs',
  );
});
