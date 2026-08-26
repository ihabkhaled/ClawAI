#!/usr/bin/env node
// Gate receipt — proof that the scoped gates already ran green over an exact
// tree, so the hooks do not pay for the same proof twice.
//
// Why this exists instead of `--no-verify`: skipping redundant work must never
// require disabling the safety net. A bypass flag is unconditional and
// unauditable — it trusts the human's memory of what they ran, and it applies
// to whatever happens to be staged at the time. A receipt is bound to the exact
// tree it proved, so any later edit silently invalidates it and the hooks run in
// full again. The fast path is unreachable without genuine, matching proof.
//
// Usage:
//   node tools/gates/receipt.mjs record            # after gates pass, before/after staging
//   node tools/gates/receipt.mjs check             # exit 0 when the receipt matches HEAD's tree
//   node tools/gates/receipt.mjs check --staged    # exit 0 when it matches the staged tree
//   node tools/gates/receipt.mjs clear
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const RECEIPT_REL = '.ai/local/gate-receipt.json';

function repoRoot() {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
}

function receiptPath() {
  return join(repoRoot(), RECEIPT_REL);
}

/** The tree the index would produce if committed right now. */
function stagedTree() {
  return execFileSync('git', ['write-tree'], { encoding: 'utf8' }).trim();
}

/** The tree of the commit that would be pushed. */
function headTree() {
  return execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim();
}

function currentBranch() {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function record() {
  const tree = stagedTree();
  const receipt = {
    tree,
    branch: currentBranch(),
    recordedAt: new Date().toISOString(),
    note: 'Scoped gates ran green over this tree. Any edit invalidates this receipt.',
  };
  const target = receiptPath();
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(`gates:receipt recorded for tree ${tree.slice(0, 12)} on ${receipt.branch}`);
  console.log('The hooks will skip the affected test/build pass for exactly this tree.');
}

function readReceipt() {
  try {
    return JSON.parse(readFileSync(receiptPath(), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * A receipt is valid only when it names the very tree about to be committed or
 * pushed. Comparing trees rather than commits means an amend, a rebase or a
 * different branch carrying identical content all remain valid, while a single
 * changed byte does not.
 */
export function isReceiptValidFor(tree) {
  const receipt = readReceipt();
  return receipt !== null && typeof receipt.tree === 'string' && receipt.tree === tree;
}

function check(useStaged) {
  const tree = useStaged ? stagedTree() : headTree();
  if (isReceiptValidFor(tree)) {
    console.log(`gates:receipt valid for tree ${tree.slice(0, 12)} — skipping the repeat pass`);
    process.exit(0);
  }
  process.exit(1);
}

function clear() {
  rmSync(receiptPath(), { force: true });
  console.log('gates:receipt cleared');
}

function main() {
  const [command, ...flags] = process.argv.slice(2);
  if (command === 'record') return record();
  if (command === 'check') return check(flags.includes('--staged'));
  if (command === 'clear') return clear();
  console.error('usage: receipt.mjs <record|check [--staged]|clear>');
  process.exit(2);
}

if (process.argv[1] && process.argv[1].endsWith('receipt.mjs')) main();
