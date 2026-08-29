import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PaygSurface } from '../payg-surface.enum';

// Enforcement for rule 37 rule 1: every money-spending surface names itself.
//
// This is the test rule 37 CLAIMED and did not have. Its absence let
// `PaygSurface.RESEARCH` live in the enum with zero producers — a member that
// asserted a spend path the system never attributed. The failure mode it guards
// is the opposite and worse: a NEW paid surface shipping without a member, so
// its spend lands in the ledger as `null` and "where did my $5 go" becomes
// unanswerable.
//
// It reads the repository rather than importing the services, because the
// services cannot import each other and a mock would prove nothing about the
// real call sites.
const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..');

/** Files that either emit a surface or render one. */
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

const LABEL_MAP = 'apps/claw-frontend/src/constants/credit.constants.ts';

function read(relative: string): string {
  return readFileSync(join(REPO_ROOT, relative), 'utf8');
}

describe('PaygSurface exhaustiveness', () => {
  const members = Object.values(PaygSurface);

  it('has members to check', () => {
    expect(members.length).toBeGreaterThan(0);
  });

  // A member nothing emits is a lie about where money goes.
  it('every member is emitted by at least one real call site', () => {
    const corpus = PRODUCERS.map(read).join('\n');
    const orphans = members.filter((member) => !corpus.includes(`PaygSurface.${member}`));
    expect(orphans).toEqual([]);
  });

  // The mirror failure: spend that reaches the ledger with no name.
  it('every member has a user-facing label so the ledger is never anonymous', () => {
    const labels = read(LABEL_MAP);
    const unlabelled = members.filter(
      (member) => !labels.includes(`billing.credit.surface.${member}`),
    );
    expect(unlabelled).toEqual([]);
  });

  it('RESEARCH is absent — it reaches search SaaS, not a paid model', () => {
    expect(members).not.toContain('RESEARCH');
  });
});
