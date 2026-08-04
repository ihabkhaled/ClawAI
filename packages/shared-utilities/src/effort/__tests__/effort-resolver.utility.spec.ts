import { ClawEffortProfile, EffortResolutionKind } from '@claw/shared-types';
import { EFFORT_BUDGET, EFFORT_PATH_OPENAI_REASONING } from '../effort-profile.constants';
import { resolveBooleanEffort, resolveEffort } from '../effort-resolver.utility';

// The governing rule (§10): never silently map an unsupported profile. Asking
// for MAX and quietly receiving `low` is indistinguishable from a model that
// simply reasoned less — the user pays for the former believing they got the
// latter. Every downgrade must be visible in resolvedProfile + warning.

const FULL = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
const NARROW = ['low', 'medium', 'high'];

describe('resolveEffort — native lanes', () => {
  it('passes an exactly-supported profile straight through', () => {
    const result = resolveEffort(ClawEffortProfile.HIGH, FULL, EFFORT_PATH_OPENAI_REASONING);

    expect(result.resolutionKind).toBe(EffortResolutionKind.NATIVE);
    expect(result.resolvedProfile).toBe(ClawEffortProfile.HIGH);
    expect(result.providerParameter).toEqual({
      path: EFFORT_PATH_OPENAI_REASONING,
      value: 'high',
    });
    expect(result.warning).toBeUndefined();
  });

  it('downgrades to the highest supported level AND says so', () => {
    const result = resolveEffort(ClawEffortProfile.MAX, NARROW, EFFORT_PATH_OPENAI_REASONING);

    expect(result.resolvedProfile).toBe(ClawEffortProfile.HIGH);
    expect(result.providerParameter?.value).toBe('high');
    // The warning is the entire point — a silent downgrade is the defect.
    expect(result.warning).toMatch(/not accepted by this model/u);
    expect(result.warning).toMatch(/resolved down to HIGH/u);
  });

  it('never walks UP to a higher level than requested', () => {
    // Spending more of the user's money than they asked for is as wrong as
    // spending less effort than they paid for.
    const result = resolveEffort(ClawEffortProfile.LOW, FULL, EFFORT_PATH_OPENAI_REASONING);

    expect(result.resolvedProfile).toBe(ClawEffortProfile.LOW);
    expect(result.providerParameter?.value).toBe('low');
  });

  it('reports when the provider ceiling has been reached', () => {
    expect(
      resolveEffort(ClawEffortProfile.MAX, FULL, EFFORT_PATH_OPENAI_REASONING)
        .providerMaximumReached,
    ).toBe(true);
    expect(
      resolveEffort(ClawEffortProfile.LOW, FULL, EFFORT_PATH_OPENAI_REASONING)
        .providerMaximumReached,
    ).toBe(false);
  });

  it('resolves a gap in the ladder downward, not upward', () => {
    // Model accepts minimal and high but not medium.
    const result = resolveEffort(
      ClawEffortProfile.MEDIUM,
      ['minimal', 'high'],
      EFFORT_PATH_OPENAI_REASONING,
    );

    expect(result.resolvedProfile).toBe(ClawEffortProfile.MINIMAL);
    expect(result.warning).toBeDefined();
  });
});

describe('resolveEffort — ULTRA is a ClawAI preset, not a provider value', () => {
  it('never sends the literal string "ultra" to a provider', () => {
    const result = resolveEffort(ClawEffortProfile.ULTRA, FULL, EFFORT_PATH_OPENAI_REASONING);

    // No provider documents an `ultra` level; sending one would be inventing a
    // parameter value.
    expect(result.providerParameter?.value).toBe('max');
    expect(result.providerParameter?.value).not.toBe('ultra');
  });

  it('keeps ULTRA identity so the extra orchestration passes still apply', () => {
    const result = resolveEffort(ClawEffortProfile.ULTRA, FULL, EFFORT_PATH_OPENAI_REASONING);

    expect(result.resolvedProfile).toBe(ClawEffortProfile.ULTRA);
    expect(result.orchestration.planningPasses).toBe(3);
    expect(result.orchestration.criticRequired).toBe(true);
    expect(result.orchestration.finalReceiptAudit).toBe(true);
    expect(result.orchestration.maxSubAgents).toBe(8);
  });

  it('uses the highest PROVEN native level when the provider tops out lower', () => {
    const result = resolveEffort(ClawEffortProfile.ULTRA, NARROW, EFFORT_PATH_OPENAI_REASONING);

    expect(result.providerParameter?.value).toBe('high');
    expect(result.providerMaximumReached).toBe(true);
  });
});

describe('resolveEffort — no proven capability', () => {
  it('orchestrates rather than inventing a parameter when nothing is proven', () => {
    // An empty supported list means the capability registry has no evidence.
    // Guessing a value here is exactly the "hard-coded model-name guess" the
    // pack forbids.
    const result = resolveEffort(ClawEffortProfile.HIGH, [], EFFORT_PATH_OPENAI_REASONING);

    expect(result.resolutionKind).toBe(EffortResolutionKind.ORCHESTRATED);
    expect(result.providerParameter).toBeUndefined();
    expect(result.warning).toMatch(/No proven provider effort control/u);
  });

  it('orchestrates when the lane has no effort parameter at all', () => {
    const result = resolveEffort(ClawEffortProfile.HIGH, FULL);

    expect(result.resolutionKind).toBe(EffortResolutionKind.ORCHESTRATED);
    expect(result.providerParameter).toBeUndefined();
  });

  it('still reports real orchestration numbers, so the effort is not fictional', () => {
    const result = resolveEffort(ClawEffortProfile.MAX, []);

    expect(result.orchestration.planningPasses).toBeGreaterThan(1);
    expect(result.orchestration.verificationPasses).toBeGreaterThan(1);
  });
});

describe('resolveEffort — AUTO', () => {
  it('resolves AUTO to the MEDIUM default', () => {
    const result = resolveEffort(ClawEffortProfile.AUTO, FULL, EFFORT_PATH_OPENAI_REASONING);

    expect(result.requested).toBe(ClawEffortProfile.AUTO);
    expect(result.resolvedProfile).toBe(ClawEffortProfile.MEDIUM);
    expect(result.providerParameter?.value).toBe('medium');
  });

  it('does not warn when AUTO lands on its default', () => {
    expect(
      resolveEffort(ClawEffortProfile.AUTO, FULL, EFFORT_PATH_OPENAI_REASONING).warning,
    ).toBeUndefined();
  });
});

describe('resolveBooleanEffort — on/off lanes', () => {
  it('maps MINIMAL and LOW to thinking off', () => {
    for (const profile of [ClawEffortProfile.MINIMAL, ClawEffortProfile.LOW]) {
      const result = resolveBooleanEffort(profile, 'think');
      expect(result.providerParameter).toEqual({ path: 'think', value: false });
    }
  });

  it('maps MEDIUM and above to thinking on', () => {
    for (const profile of [
      ClawEffortProfile.MEDIUM,
      ClawEffortProfile.HIGH,
      ClawEffortProfile.MAX,
      ClawEffortProfile.ULTRA,
    ]) {
      const result = resolveBooleanEffort(profile, 'think');
      expect(result.providerParameter).toEqual({ path: 'think', value: true });
    }
  });

  it('always warns that intermediate levels are indistinguishable here', () => {
    // The coarseness is real and must be reported rather than hidden.
    const result = resolveBooleanEffort(ClawEffortProfile.HIGH, 'think');

    expect(result.resolutionKind).toBe(EffortResolutionKind.BOOLEAN);
    expect(result.warning).toMatch(/on\/off flag/u);
  });
});

describe('budget envelopes', () => {
  it('increases monotonically up the ladder', () => {
    const ladder = [
      ClawEffortProfile.MINIMAL,
      ClawEffortProfile.LOW,
      ClawEffortProfile.MEDIUM,
      ClawEffortProfile.HIGH,
      ClawEffortProfile.XHIGH,
      ClawEffortProfile.MAX,
      ClawEffortProfile.ULTRA,
    ];
    for (let i = 1; i < ladder.length; i++) {
      const lower = EFFORT_BUDGET[ladder[i - 1] as ClawEffortProfile];
      const higher = EFFORT_BUDGET[ladder[i] as ClawEffortProfile];
      expect(higher.maxModelTurns).toBeGreaterThanOrEqual(lower.maxModelTurns);
      expect(higher.maxToolCalls).toBeGreaterThanOrEqual(lower.maxToolCalls);
      expect(higher.maxSubAgents).toBeGreaterThanOrEqual(lower.maxSubAgents);
    }
  });

  it('carries the resolved profile budget, not the requested one', () => {
    // A downgraded run must not keep the larger budget it did not get.
    const result = resolveEffort(ClawEffortProfile.MAX, NARROW, EFFORT_PATH_OPENAI_REASONING);

    expect(result.resolvedProfile).toBe(ClawEffortProfile.HIGH);
    expect(result.budget).toEqual(EFFORT_BUDGET[ClawEffortProfile.HIGH]);
  });

  it('gives MINIMAL no sub-agents and no research', () => {
    const budget = EFFORT_BUDGET[ClawEffortProfile.MINIMAL];
    expect(budget.maxSubAgents).toBe(0);
    expect(budget.maxModelTurns).toBe(8);
  });
});
