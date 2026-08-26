import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import test from 'node:test';

import { isReceiptValidFor } from '../gates/receipt.mjs';
import { repoPath } from '../lib/repo.mjs';

// Rule 34. The receipt exists so the hooks can skip work they have already been
// given proof for — which is only safe if the proof is bound to the exact tree.
// These tests guard that binding: the whole reason this mechanism is allowed to
// exist instead of `--no-verify` is that it cannot be pointed at a tree it never
// verified.

const RECEIPT = repoPath('.ai/local/gate-receipt.json');

function withReceipt(contents, run) {
  const had = existsSync(RECEIPT);
  const previous = had ? readFileSync(RECEIPT, 'utf8') : null;
  mkdirSync(dirname(RECEIPT), { recursive: true });
  writeFileSync(RECEIPT, contents, 'utf8');
  try {
    run();
  } finally {
    if (previous === null) rmSync(RECEIPT, { force: true });
    else writeFileSync(RECEIPT, previous, 'utf8');
  }
}

test('a receipt for a different tree is rejected', () => {
  withReceipt(JSON.stringify({ tree: '0'.repeat(40), recordedAt: 'x' }), () => {
    assert.equal(
      isReceiptValidFor('f'.repeat(40)),
      false,
      'a receipt naming another tree must never satisfy the gate',
    );
  });
});

test('a receipt for the matching tree is accepted', () => {
  const tree = 'a'.repeat(40);
  withReceipt(JSON.stringify({ tree, recordedAt: 'x' }), () => {
    assert.equal(isReceiptValidFor(tree), true);
  });
});

test('a malformed or absent receipt is rejected rather than trusted', () => {
  withReceipt('not json at all', () => {
    assert.equal(isReceiptValidFor('a'.repeat(40)), false);
  });
  withReceipt(JSON.stringify({ recordedAt: 'x' }), () => {
    assert.equal(isReceiptValidFor('a'.repeat(40)), false, 'a receipt with no tree proves nothing');
  });

  const had = existsSync(RECEIPT);
  const previous = had ? readFileSync(RECEIPT, 'utf8') : null;
  rmSync(RECEIPT, { force: true });
  try {
    assert.equal(isReceiptValidFor('a'.repeat(40)), false, 'no receipt means run the gates');
  } finally {
    if (previous !== null) writeFileSync(RECEIPT, previous, 'utf8');
  }
});

test('the receipt file is not committed', () => {
  // It records one developer's local proof; committing it would let one machine
  // suppress another machine's gates.
  const ignored = execFileSync('git', ['check-ignore', '.ai/local/gate-receipt.json'], {
    cwd: repoPath('.'),
    encoding: 'utf8',
  }).trim();
  assert.equal(ignored, '.ai/local/gate-receipt.json');
});

test('the pre-push hook consults the receipt instead of bypassing the hook', () => {
  const hook = readFileSync(repoPath('.husky/pre-push'), 'utf8');
  assert.match(hook, /tools\/gates\/receipt\.mjs check/, 'pre-push must consult the receipt');
  // Without a valid receipt the expensive stages must still run in full — the
  // receipt is a fast path, not an escape hatch.
  assert.match(
    hook,
    /affected\/index\.mjs test/,
    'the full test pass must remain in the else branch',
  );
  assert.match(
    hook,
    /affected\/index\.mjs build/,
    'the full build pass must remain in the else branch',
  );
  // The hook may WARN about --no-verify, but must never invoke it.
  for (const line of hook.split('\n')) {
    if (line.trimStart().startsWith('#')) continue;
    assert.ok(!line.includes('--no-verify'), `hook must not invoke a bypass: ${line.trim()}`);
  }
});
