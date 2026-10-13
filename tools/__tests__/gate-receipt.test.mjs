import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { receiptContext, receiptCovers, recordReceipt, RECEIPT_REL } from '../gates/receipt.mjs';
import { repoPath } from '../lib/repo.mjs';

// Rule 34. A receipt lets a hook skip a gate it already has proof for — which
// is only safe if the proof is bound to the exact tree, environment and gate
// scope, and if nothing but the affected runner can write one.

const RECEIPT = repoPath(RECEIPT_REL);
const TREE = 'a'.repeat(40);

function withReceiptFile(contents, run) {
  const previous = existsSync(RECEIPT) ? readFileSync(RECEIPT, 'utf8') : null;
  mkdirSync(dirname(RECEIPT), { recursive: true });
  if (contents === null) rmSync(RECEIPT, { force: true });
  else writeFileSync(RECEIPT, contents, 'utf8');
  try {
    run();
  } finally {
    if (previous === null) rmSync(RECEIPT, { force: true });
    else writeFileSync(RECEIPT, previous, 'utf8');
  }
}

function v2(receipts) {
  return JSON.stringify({ version: 2, receipts });
}

test('a recorded gate covers its own scope, and nothing more', () => {
  withReceiptFile(null, () => {
    recordReceipt(TREE, 'test', ['claw-chat-service']);
    assert.equal(receiptCovers(TREE, 'test', ['claw-chat-service']), true);
    assert.equal(receiptCovers(TREE, 'test', ['claw-chat-service', 'claw-auth-service']), false);
    assert.equal(receiptCovers(TREE, 'build', ['claw-chat-service']), false, 'a gate it did not run');
    assert.equal(receiptCovers('b'.repeat(40), 'test', ['claw-chat-service']), false, 'another tree');
  });
});

test('recording more gates for the same tree accumulates them', () => {
  withReceiptFile(null, () => {
    recordReceipt(TREE, 'typecheck', ['a']);
    recordReceipt(TREE, 'build', ['a']);
    recordReceipt(TREE, 'typecheck', ['b']);
    assert.equal(receiptCovers(TREE, 'typecheck', ['a', 'b']), true);
    assert.equal(receiptCovers(TREE, 'build', ['a']), true);
  });
});

test('a receipt from another lockfile, Node version or tool version is rejected', () => {
  const context = receiptContext();
  for (const changed of [{ lockHash: 'x' }, { node: 'v0.0.0' }, { tool: 'y' }]) {
    withReceiptFile(v2([{ tree: TREE, ...context, ...changed, gates: { test: ['a'] } }]), () => {
      assert.equal(receiptCovers(TREE, 'test', ['a']), false, JSON.stringify(changed));
    });
  }
  withReceiptFile(v2([{ tree: TREE, ...context, gates: { test: ['a'] } }]), () => {
    assert.equal(receiptCovers(TREE, 'test', ['a']), true, 'the same receipt in context is accepted');
  });
});

test('a forged, legacy, malformed or absent receipt proves nothing', () => {
  for (const contents of [
    null,
    'not json at all',
    JSON.stringify({ tree: TREE, recordedAt: 'x' }),
    v2([{ tree: TREE, gates: { test: ['a'] } }]),
    v2([{ ...receiptContext(), gates: { test: ['a'] } }]),
  ]) {
    withReceiptFile(contents, () => {
      assert.equal(receiptCovers(TREE, 'test', ['a']), false, String(contents));
    });
  }
});

test('the receipt CLI cannot record — only the affected runner writes receipts', () => {
  const result = spawnSync(process.execPath, ['tools/gates/receipt.mjs', 'record'], {
    cwd: repoPath(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /only by the affected/u);

  const importers = [];
  const walk = (dir) => {
    for (const entry of readdirSync(repoPath(dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') walk(rel);
      } else if (entry.name.endsWith('.mjs') && /recordReceipt/u.test(readFileSync(repoPath(rel), 'utf8'))) {
        importers.push(rel);
      }
    }
  };
  walk('tools');
  assert.deepEqual(importers.sort(), ['tools/affected/index.mjs', 'tools/gates/receipt.mjs']);
});

test('gates:receipt runs the gates instead of writing a bare record', () => {
  const pkg = JSON.parse(readFileSync(repoPath('package.json'), 'utf8'));
  assert.equal(pkg.scripts['gates:receipt'], 'node tools/affected/index.mjs gates');
});

test('the receipt file is not committed', () => {
  // It records one developer's local proof; committing it would let one
  // machine suppress another machine's gates.
  const ignored = execFileSync('git', ['check-ignore', RECEIPT_REL], {
    cwd: repoPath('.'),
    encoding: 'utf8',
  }).trim();
  assert.equal(ignored, RECEIPT_REL);
});

test('the hooks delegate to the receipt-aware gate scripts and never bypass', () => {
  const preCommit = readFileSync(repoPath('.husky/pre-commit'), 'utf8');
  const prePush = readFileSync(repoPath('.husky/pre-push'), 'utf8');
  assert.match(preCommit, /node tools\/gates\/pre-commit\.mjs/u);
  assert.match(preCommit, /node tools\/affected\/index\.mjs knowledge --record/u);
  assert.match(prePush, /node tools\/gates\/pre-push\.mjs/u);
  // The ref list on stdin must reach pre-push.mjs, not be thrown away.
  assert.doesNotMatch(prePush, /^\s*cat\s+>\s*\/dev\/null/mu);
  for (const hook of [preCommit, prePush]) {
    for (const line of hook.split('\n')) {
      if (line.trimStart().startsWith('#')) continue;
      assert.ok(!line.includes('--no-verify'), `hook must not invoke a bypass: ${line.trim()}`);
    }
  }
});

test('every tool file a receipt is bound to exists', () => {
  const source = readFileSync(repoPath('tools/gates/receipt.mjs'), 'utf8');
  const listed = [...source.matchAll(/^ {2}'([^']+)',$/gmu)].map((m) => m[1]);
  assert.ok(listed.length >= 10);
  for (const file of listed) assert.ok(existsSync(join(repoPath(), file)), file);
});
