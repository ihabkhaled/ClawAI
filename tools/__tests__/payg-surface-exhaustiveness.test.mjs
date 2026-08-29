import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { repoPath } from '../lib/repo.mjs';

// Enforcement for rule 37 rule 1: every money-spending surface names itself.
//
// It lives HERE, not beside the enum, on purpose. `tools/affected` fans a
// package change out to its dependents but never the reverse, so a test in
// `packages/shared-types` that reads four app workspaces would not run when one
// of those apps deletes its last call site — precisely the change it exists to
// catch. `npm run knowledge:test` runs this on every commit and every push,
// regardless of what was touched.
//
// The absence of this check let `PaygSurface.RESEARCH` sit in the enum with zero
// producers, asserting a spend path the system never attributed. The failure it
// really guards is the mirror: a NEW paid surface shipping without a member, so
// its spend lands in the ledger as `null` and "where did my $5 go" becomes
// unanswerable.

const ENUM_FILE = 'packages/shared-types/src/enums/payg-surface.enum.ts';
const LABEL_MAP = 'apps/claw-frontend/src/constants/credit.constants.ts';

/** Files that emit a surface into a reservation. */
const PRODUCERS = [
  'apps/claw-chat-service/src/modules/chat-messages/constants/payg.constants.ts',
  'apps/claw-chat-service/src/modules/chat-messages/managers/chat-execution.manager.ts',
  'apps/claw-chat-service/src/modules/chat-messages/managers/parallel-execution.manager.ts',
  'apps/claw-chat-service/src/modules/chat-messages/managers/runtime-v2-loop.manager.ts',
  'apps/claw-chat-service/src/modules/chat-messages/services/access-control.service.ts',
  'apps/claw-image-service/src/modules/image-generation/managers/image-execution.manager.ts',
  'apps/claw-routing-service/src/modules/routing/managers/router-inference-coordinator.manager.ts',
  'apps/claw-workspace-service/src/modules/ai-actions/managers/ai-action-execution.manager.ts',
];

const read = (relative) => readFileSync(repoPath(relative), 'utf8');

/** Members parsed from the enum source — no build step, so this runs anywhere. */
function paygSurfaceMembers() {
  const body = read(ENUM_FILE);
  const open = body.indexOf('export enum PaygSurface {');
  assert.notEqual(open, -1, 'PaygSurface enum not found');
  const close = body.indexOf('\n}', open);
  return [...body.slice(open, close).matchAll(/^\s{2}([A-Z_]+)\s*=/gm)].map((m) => m[1]);
}

test('PaygSurface has members to check', () => {
  assert.ok(paygSurfaceMembers().length >= 8);
});

test('every PaygSurface member is emitted by at least one real call site', () => {
  const corpus = PRODUCERS.map(read).join('\n');
  const orphans = paygSurfaceMembers().filter(
    (member) => !corpus.includes(`PaygSurface.${member}`),
  );
  assert.deepEqual(
    orphans,
    [],
    `PaygSurface members with no producer: ${orphans.join(', ')}. A member nothing emits is a claim about where money goes that the system does not honour.`,
  );
});

test('every PaygSurface member has a user-facing ledger label', () => {
  const labels = read(LABEL_MAP);
  const unlabelled = paygSurfaceMembers().filter(
    (member) => !labels.includes(`billing.credit.surface.${member}`),
  );
  assert.deepEqual(
    unlabelled,
    [],
    `PaygSurface members with no ledger label: ${unlabelled.join(', ')}. Spend that reaches the ledger anonymous is spend the user cannot question.`,
  );
});

test('RESEARCH is absent — it reaches search SaaS, not a paid model', () => {
  assert.ok(!paygSurfaceMembers().includes('RESEARCH'));
});
