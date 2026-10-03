import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LANES,
  commitOwesEvidence,
  evidenceFilesIn,
  renderTemplate,
  validateRecord,
} from '../qa/evidence-lib.mjs';

function filled(overrides = {}, verdict = 'DONE') {
  const rows = LANES.map(([id, name]) => {
    const o = overrides[id] ?? ['PASS', `ran \`npx vitest run x\` => 12 passed, see run ${id}`];
    return `| ${id} | ${name} | ${o[0]} | ${o[1]} |`;
  }).join('\n');
  return `Batch: chat parity batch\nVerdict: ${verdict}\n\n| Lane | What | Status | Evidence or reason |\n| --- | --- | --- | --- |\n${rows}\n`;
}

test('a fully evidenced DONE record is valid', () => {
  assert.deepEqual(validateRecord(filled()), []);
});

test('the untouched template is rejected, lane by lane', () => {
  const problems = validateRecord(renderTemplate('x-batch'));
  assert.equal(problems.filter((p) => p.includes('unfilled template')).length, LANES.length);
});

test('a missing lane is a problem', () => {
  const text = filled()
    .split('\n')
    .filter((l) => !l.startsWith('| L07'))
    .join('\n');
  assert.ok(validateRecord(text).some((p) => p.startsWith('L07')));
});

test('PASS without real evidence is rejected', () => {
  const problems = validateRecord(filled({ L03: ['PASS', 'ok'] }));
  assert.ok(problems.some((p) => p.startsWith('L03: PASS needs evidence')));
});

test('PASS that reads as an assumption is rejected', () => {
  const problems = validateRecord(filled({ L04: ['PASS', 'this should work in the browser'] }));
  assert.ok(problems.some((p) => p.includes('placeholder or an assumption')));
});

test('NOT_RUN needs a reason and blocks DONE', () => {
  const noReason = validateRecord(filled({ L08: ['NOT_RUN', 'x'] }, 'PARTIAL'));
  assert.ok(noReason.some((p) => p.startsWith('L08: NOT_RUN needs a reason')));
  const done = validateRecord(
    filled({ L08: ['NOT_RUN', 'no visible browser in the agent session'] }),
  );
  assert.ok(done.some((p) => p.includes('Verdict DONE but L08 NOT_RUN')));
  const partial = validateRecord(
    filled({ L08: ['NOT_RUN', 'no visible browser in the agent session'] }, 'PARTIAL'),
  );
  assert.deepEqual(partial, []);
});

test('NOT_APPLICABLE is allowed with a reason', () => {
  const text = filled({ L13: ['NOT_APPLICABLE', 'no public page or hot path changed'] });
  assert.deepEqual(validateRecord(text), []);
});

test('FAIL blocks DONE', () => {
  const problems = validateRecord(filled({ L06: ['FAIL', 'free tier gets 500 on save'] }));
  assert.ok(problems.some((p) => p.includes('L06 FAIL')));
});

test('which commits owe a record', () => {
  assert.equal(commitOwesEvidence('feat(chat): x', ['apps/claw-chat-service/src/a.ts']), true);
  assert.equal(commitOwesEvidence('fix: x', ['packages/shared-types/src/a.ts']), true);
  assert.equal(commitOwesEvidence('docs: x', ['apps/claw-chat-service/src/a.ts']), false);
  assert.equal(commitOwesEvidence('feat(chat): x', ['docs/a.md', 'rules/a.md']), false);
  assert.equal(
    commitOwesEvidence('chore(release): v1', ['apps/claw-chat-service/src/a.ts']),
    false,
  );
});

test('only dated qa-evidence records count', () => {
  assert.deepEqual(
    evidenceFilesIn([
      'docs/qa-evidence/2026-10-03-chat-parity.md',
      'docs/qa-evidence/README.md',
      'a.ts',
    ]),
    ['docs/qa-evidence/2026-10-03-chat-parity.md'],
  );
});
