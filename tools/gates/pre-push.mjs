#!/usr/bin/env node
// Pre-push gate. Called by .husky/pre-push after uncommitted work is parked, so
// the working tree is exactly HEAD. It validates the tree of EVERY ref being
// pushed — read from the ref list git writes to stdin — not just HEAD.
//
// For the checked-out tree it runs, skipping only what a matching receipt
// proves already ran (rules/34):
//   1. knowledge integrity  (knowledge:verify + audit:check)
//   2. root-invariant checks (lockfile, ESLint config, tsconfig, tooling tests)
//   3. typecheck of workspaces that depend on a changed shared package
//   4. tests of directly changed workspaces (`vitest related` where possible)
//   5. build of directly changed workspaces
// A pushed ref whose tree is NOT checked out cannot be gated here; it passes
// only when receipts cover every one of those gates for its tree.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { computeAffected, loadWorkspaces, planGate, runGate, runRootChecks } from '../affected/index.mjs';
import { parsePrePushRefs, resolveDefaultBase, treeOf } from '../lib/git.mjs';
import { isMain } from '../lib/repo.mjs';
import { receiptCovers } from './receipt.mjs';

const GATES = [
  ['typecheck', { kinds: ['dependent'] }],
  ['test', { related: true }],
  ['build', {}],
];

function readStdin() {
  if (process.stdin.isTTY) return '';
  try {
    return readFileSync(0, 'utf8');
  } catch {
    // No stdin attached (a manual run): validate HEAD below.
    return '';
  }
}

function runNode(script, args) {
  try {
    execFileSync(process.execPath, [script, ...args], { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

/** Every gate this ref needs, with the scope a receipt would have to cover. */
export function requiredGates(result, workspaces) {
  return [
    { gate: 'knowledge', scope: ['repo'] },
    { gate: 'root', scope: ['repo'] },
    ...GATES.map(([gate, options]) => ({
      gate,
      options,
      scope: planGate(gate, result, workspaces, options).scope,
    })),
  ];
}

async function gateCheckedOutTree(tree, result) {
  const workspaces = loadWorkspaces();
  for (const { gate, scope, options } of requiredGates(result, workspaces)) {
    if (receiptCovers(tree, gate, scope)) {
      console.log(`pre-push ${gate}: skipped — receipt covers tree ${tree.slice(0, 12)} (rules/34)`);
      continue;
    }
    console.log(`pre-push ${gate}:`);
    let ok;
    if (gate === 'knowledge') {
      ok = runNode('tools/knowledge/verify.mjs', []) && runNode('tools/audit/index.mjs', ['--check']);
    } else if (gate === 'root') {
      ok = await runRootChecks(result.files, { tooling: true });
    } else {
      ({ ok } = await runGate(gate, result, options));
    }
    if (!ok) {
      console.error(`✖ pre-push ${gate} failed`);
      return false;
    }
  }
  return true;
}

function missingReceipts(tree, result) {
  return requiredGates(result, loadWorkspaces())
    .filter(({ gate, scope }) => !receiptCovers(tree, gate, scope))
    .map(({ gate }) => gate);
}

export async function prePush(stdinText) {
  const refs = parsePrePushRefs(stdinText);
  const targets = refs.length > 0 ? refs : [{ localRef: 'HEAD', localSha: 'HEAD' }];
  const base = resolveDefaultBase();
  const headTree = treeOf('HEAD');
  const gated = new Set();

  for (const ref of targets) {
    const tree = treeOf(ref.localSha);
    if (gated.has(tree)) continue;
    const result = computeAffected(base, { head: ref.localSha });
    console.log(`pre-push: ${ref.localRef} (${ref.localSha.slice(0, 12)}) vs ${base} — ${result.changedFileCount} changed file(s)`);

    if (tree !== headTree) {
      const missing = missingReceipts(tree, result);
      if (missing.length > 0) {
        console.error(
          `✖ ${ref.localRef} is not checked out, so its tree cannot be gated here ` +
            `(no receipt for: ${missing.join(', ')}). Check it out and push from there.`,
        );
        return false;
      }
      console.log(`pre-push: ${ref.localRef} fully covered by receipts for tree ${tree.slice(0, 12)}`);
    } else if (!(await gateCheckedOutTree(tree, result))) {
      return false;
    }
    gated.add(tree);
  }
  return true;
}

if (isMain(import.meta.url)) {
  prePush(readStdin()).then(
    (ok) => process.exit(ok ? 0 : 1),
    (error) => {
      console.error(`✖ pre-push: ${error.message}`);
      process.exit(1);
    },
  );
}
