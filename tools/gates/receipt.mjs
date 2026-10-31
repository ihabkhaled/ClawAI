#!/usr/bin/env node
// Gate receipt — proof that named gates already ran green over an exact tree,
// so the hooks do not pay for the same proof twice (rules/34).
//
// A receipt is never self-attested. Only the affected runner
// (tools/affected/index.mjs) writes one, and only after the gates it names
// exited 0 over a working tree identical to the index. Each receipt records:
//
//   tree      the tree hash the gates ran over
//   gates     gate -> the exact workspaces it ran for (or ['repo'])
//   lockHash  package-lock.json content hash
//   node      the Node version that ran them
//   tool      a hash of the gate tooling + hooks themselves
//
// A hook may skip a gate only when a receipt for that exact tree, lockfile,
// Node and tool version lists that gate for a superset of the workspaces the
// hook would have run. Anything else — a different byte, a dependency bump, a
// Node upgrade, an edited hook — and the hook runs in full.
//
// CLI (read-only — there is deliberately no `record` command):
//   node tools/gates/receipt.mjs check --tree=<sha> --gate=<g> [--scope=a,b]
//   node tools/gates/receipt.mjs show
//   node tools/gates/receipt.mjs clear
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { normalizeEol } from '../lib/fact.mjs';
import { isMain, readText, repoPath } from '../lib/repo.mjs';

export const RECEIPT_REL = '.ai/local/gate-receipt.json';
const RECEIPT_VERSION = 2;
const MAX_RECEIPTS = 20;

/** Files whose content defines what a gate run means. Editing any voids every receipt. */
export const TOOL_FILES = [
  '.husky/pre-commit',
  '.husky/pre-push',
  'tools/affected/index.mjs',
  'tools/affected/pool.mjs',
  'tools/affected/root-checks.mjs',
  'tools/affected/shared-build.mjs',
  'tools/gates/pre-commit.mjs',
  'tools/gates/pre-push.mjs',
  'tools/gates/receipt.mjs',
  'tools/gates/autosync.mjs',
  'tools/gates/self-heal.mjs',
  'tools/gates/registry.mjs',
  'tools/lib/git.mjs',
  'tools/lib/npm.mjs',
];

function contentHash(parts) {
  const hash = createHash('sha256');
  for (const part of parts) hash.update(normalizeEol(part ?? '<absent>')).update('\0');
  return hash.digest('hex');
}

/** The environment a receipt is bound to, besides its tree. */
export function receiptContext() {
  return {
    lockHash: contentHash([readText(repoPath('package-lock.json'))]),
    node: process.version,
    tool: contentHash(TOOL_FILES.map((file) => readText(repoPath(file)))),
  };
}

function receiptPath() {
  return repoPath(RECEIPT_REL);
}

export function readReceipts() {
  try {
    const parsed = JSON.parse(readFileSync(receiptPath(), 'utf8'));
    if (parsed?.version !== RECEIPT_VERSION || !Array.isArray(parsed.receipts)) return [];
    return parsed.receipts;
  } catch {
    // Absent or unreadable receipts are "no proof", never an error.
    return [];
  }
}

function sameContext(receipt, context) {
  return (
    receipt.lockHash === context.lockHash &&
    receipt.node === context.node &&
    receipt.tool === context.tool
  );
}

/**
 * True when a receipt proves `gate` ran green over `tree` for every workspace
 * in `scope`. An empty scope still needs the gate to be named: a receipt can
 * never vouch for a gate it did not run.
 */
export function receiptCovers(tree, gate, scope = [], context = receiptContext()) {
  if (typeof tree !== 'string' || tree.length === 0) return false;
  return readReceipts().some((receipt) => {
    if (receipt?.tree !== tree || !sameContext(receipt, context)) return false;
    const ran = receipt.gates?.[gate];
    return Array.isArray(ran) && scope.every((name) => ran.includes(name));
  });
}

/**
 * Record that `gate` ran green over `tree` for `scope`. Called only by the
 * affected runner after the gate exited 0 — see tools/__tests__/gate-receipt.test.mjs,
 * which fails if any other module imports this function.
 */
export function recordReceipt(tree, gate, scope, context = receiptContext()) {
  const receipts = readReceipts().filter((r) => !(r.tree === tree && !sameContext(r, context)));
  let entry = receipts.find((r) => r.tree === tree);
  if (!entry) {
    entry = { tree, ...context, gates: {}, recordedAt: null };
    receipts.push(entry);
  }
  entry.gates[gate] = [...new Set([...(entry.gates[gate] ?? []), ...scope])].sort();
  entry.recordedAt = new Date().toISOString();
  const kept = receipts.slice(-MAX_RECEIPTS);
  mkdirSync(dirname(receiptPath()), { recursive: true });
  writeFileSync(
    receiptPath(),
    `${JSON.stringify({ version: RECEIPT_VERSION, receipts: kept }, null, 2)}\n`,
    'utf8',
  );
}

function flag(name) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : undefined;
}

function main() {
  const [command] = process.argv.slice(2);
  if (command === 'check') {
    const tree = flag('tree');
    const gate = flag('gate');
    const scope = (flag('scope') ?? '').split(',').filter(Boolean);
    if (!tree || !gate) {
      console.error('usage: receipt.mjs check --tree=<sha> --gate=<gate> [--scope=a,b]');
      process.exit(2);
    }
    process.exit(receiptCovers(tree, gate, scope) ? 0 : 1);
  }
  if (command === 'show') {
    console.log(JSON.stringify(readReceipts(), null, 2));
    return;
  }
  if (command === 'clear') {
    rmSync(receiptPath(), { force: true });
    console.log('gates:receipt cleared');
    return;
  }
  console.error(
    'usage: receipt.mjs <check|show|clear>. Receipts are written only by the affected ' +
      'runner after its gates pass: npm run gates:receipt',
  );
  process.exit(2);
}

if (isMain(import.meta.url)) main();
