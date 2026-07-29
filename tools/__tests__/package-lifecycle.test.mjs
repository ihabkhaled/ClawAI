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
    assert.match(
      hook,
      /"\$CURRENT_STASH"\s*=\s*"\$STASH_REF"/u,
      `${hookName} must not pop an unrelated stash entry`,
    );
  }
});
