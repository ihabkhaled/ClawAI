#!/usr/bin/env node
// Pre-commit code gates (step 3 of .husky/pre-commit), judged on the STAGED
// set only:
//   - root-invariant checks for a lockfile, ESLint-config or tsconfig change
//   - typecheck of every workspace the staged change affects, after rebuilding
//     any stale shared package
// Each is skipped only when a receipt for the exact staged tree proves it ran
// (rules/34). A docs-only commit affects no workspace and runs neither.
import { computeAffected, planGate, loadWorkspaces, runGate, runRootChecks } from '../affected/index.mjs';
import { git } from '../lib/git.mjs';
import { isMain } from '../lib/repo.mjs';
import { receiptCovers } from './receipt.mjs';

export async function preCommit() {
  const tree = git(['write-tree']);
  const result = computeAffected(undefined, { staged: true });

  if (receiptCovers(tree, 'root', ['repo'])) {
    console.log('pre-commit root-checks: skipped — receipt covers this staged tree');
  } else if (!(await runRootChecks(result.files))) {
    return false;
  }

  const { scope } = planGate('typecheck', result, loadWorkspaces());
  if (scope.length > 0 && receiptCovers(tree, 'typecheck', scope)) {
    console.log('pre-commit typecheck: skipped — receipt covers this staged tree');
    return true;
  }
  const { ok } = await runGate('typecheck', result);
  return ok;
}

if (isMain(import.meta.url)) {
  preCommit().then(
    (ok) => process.exit(ok ? 0 : 1),
    (error) => {
      console.error(`✖ pre-commit: ${error.message}`);
      process.exit(1);
    },
  );
}
