import { CapabilityBlastRadius } from '../../enums/capability-blast-radius.enum';
import { CapabilityClass } from '../../enums/capability-class.enum';
import { CapabilityOperation } from '../../enums/capability-operation.enum';
import { CapabilityReversibility } from '../../enums/capability-reversibility.enum';
import { matchesCapabilityTarget } from '../policy-target-matcher.utility';

const killInput = (targetDescriptor: Record<string, unknown>) => ({
  capabilityClass: CapabilityClass.PROCESS,
  capabilityOperation: CapabilityOperation.KILL,
  targetDescriptor,
  payload: { signal: 'SIGTERM' },
  blastRadius: CapabilityBlastRadius.SINGLE_RESOURCE,
  reversibility: CapabilityReversibility.IRREVERSIBLE,
  userId: 'u1',
  deviceId: 'd1',
});

const OTHER_UID_DENY = { uidMatchesCurrentUser: true };

describe('deny-process-kill-other-uid matcher', () => {
  it('does not deny a shell-launched job the agent started (managedByAgent)', () => {
    expect(
      matchesCapabilityTarget(OTHER_UID_DENY, killInput({ pid: 4321, managedByAgent: true })),
    ).toBe(false);
  });

  it('does not deny a registered shell job identified by jobId', () => {
    expect(matchesCapabilityTarget(OTHER_UID_DENY, killInput({ pid: 4321, jobId: 'job-1' }))).toBe(
      false,
    );
  });

  it('does not deny when the caller confirms the uid is the current user', () => {
    expect(
      matchesCapabilityTarget(
        OTHER_UID_DENY,
        killInput({ pid: 4321, uidMatchesCurrentUser: true }),
      ),
    ).toBe(false);
  });

  it('still denies an unknown process with no ownership evidence', () => {
    expect(matchesCapabilityTarget(OTHER_UID_DENY, killInput({ pid: 4321 }))).toBe(true);
  });

  it('denies a managed-looking target whose uid is explicitly foreign', () => {
    expect(
      matchesCapabilityTarget(
        OTHER_UID_DENY,
        killInput({ pid: 4321, managedByAgent: true, uidMatchesCurrentUser: false }),
      ),
    ).toBe(true);
  });
});
