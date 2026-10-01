import {
  RUNNER_NOT_APPLICABLE,
  RUNNER_POLICY_PLATFORMS,
} from '../../constants/runner-policy.constants';
import { agentPlatformSchema } from '../../../agent/dto/create-agent-session.dto';
import { evaluateRunnerReport, readRunnerPolicy } from '../runner-compliance.utility';

import type { RunnerPolicy, RunnerPolicyMode, RunnerReport } from '../../types/runner-policy.types';

function policy(mode: RunnerPolicyMode, overrides: Partial<RunnerPolicy> = {}): RunnerPolicy {
  return {
    minRunnerVersion: '1.90.0',
    allowedRunnerPlatforms: ['linux', 'windows'],
    runnerPolicyMode: mode,
    requireVersionReport: false,
    ...overrides,
  };
}

const compliant: RunnerReport = { agentVersion: '1.92.0', platform: 'linux' };
const oldVersion: RunnerReport = { agentVersion: '1.80.0', platform: 'linux' };
const badPlatform: RunnerReport = { agentVersion: '1.92.0', platform: 'darwin' };
const silent: RunnerReport = {};

describe('evaluateRunnerReport: mode x report matrix', () => {
  it('off never evaluates, flags or refuses, whatever the runner says', () => {
    for (const report of [compliant, oldVersion, badPlatform, silent]) {
      expect(evaluateRunnerReport([policy('off', { requireVersionReport: true })], report)).toEqual(
        RUNNER_NOT_APPLICABLE,
      );
    }
  });

  it('no policy at all (a user in no organization) is not applicable', () => {
    expect(evaluateRunnerReport([], oldVersion)).toEqual(RUNNER_NOT_APPLICABLE);
  });

  it('report: a compliant runner is compliant', () => {
    expect(evaluateRunnerReport([policy('report')], compliant)).toEqual({
      evaluated: true,
      status: 'compliant',
      reason: null,
      refuse: false,
    });
  });

  it('report: flags a stale or wrong-platform runner and never refuses', () => {
    expect(evaluateRunnerReport([policy('report')], oldVersion)).toMatchObject({
      status: 'noncompliant',
      reason: 'version_below_minimum',
      refuse: false,
    });
    expect(evaluateRunnerReport([policy('report')], badPlatform)).toMatchObject({
      status: 'noncompliant',
      reason: 'platform_not_allowed',
      refuse: false,
    });
  });

  it('report: a silent runner is unknown and never refused, even with requireVersionReport', () => {
    expect(
      evaluateRunnerReport([policy('report', { requireVersionReport: true })], silent),
    ).toMatchObject({ status: 'unknown', refuse: false });
  });

  it('enforce: refuses a definite violation', () => {
    expect(evaluateRunnerReport([policy('enforce')], oldVersion)).toMatchObject({
      status: 'noncompliant',
      refuse: true,
    });
    expect(evaluateRunnerReport([policy('enforce')], badPlatform)).toMatchObject({
      refuse: true,
    });
  });

  it('enforce: lets a compliant runner through', () => {
    expect(evaluateRunnerReport([policy('enforce')], compliant)).toMatchObject({
      status: 'compliant',
      refuse: false,
    });
  });

  it('enforce: a silent runner is unknown and allowed unless requireVersionReport is set', () => {
    expect(evaluateRunnerReport([policy('enforce')], silent)).toMatchObject({
      status: 'unknown',
      refuse: false,
    });
    expect(
      evaluateRunnerReport([policy('enforce', { requireVersionReport: true })], silent),
    ).toMatchObject({ status: 'unknown', refuse: true });
  });

  it('enforce with no constraint set is inert: nothing to check, so nothing refused', () => {
    const empty = policy('enforce', {
      minRunnerVersion: null,
      allowedRunnerPlatforms: null,
      requireVersionReport: true,
    });
    expect(evaluateRunnerReport([empty], silent)).toEqual(RUNNER_NOT_APPLICABLE);
  });

  it('a definite violation beats unknown, and both reasons are listed', () => {
    const result = evaluateRunnerReport([policy('enforce')], { agentVersion: '1.0.0' });
    expect(result.status).toBe('noncompliant');
    expect(result.reason).toBe('version_below_minimum,platform_missing');
  });
});

describe('evaluateRunnerReport: version edge cases', () => {
  const at = (version: string) =>
    evaluateRunnerReport([policy('enforce', { allowedRunnerPlatforms: null })], {
      agentVersion: version,
    });

  it('accepts exactly the minimum, a v-prefixed form of it, and anything newer', () => {
    expect(at('1.90.0').refuse).toBe(false);
    expect(at('v1.90.0').refuse).toBe(false);
    expect(at('2.0.0').refuse).toBe(false);
  });

  it('a prerelease of the minimum is below it', () => {
    expect(at('1.90.0-rc.1')).toMatchObject({ status: 'noncompliant', refuse: true });
  });

  it('junk is unknown rather than stale: it cannot be compared, so it is not refused', () => {
    expect(at('banana')).toMatchObject({
      status: 'unknown',
      reason: 'version_unreadable',
      refuse: false,
    });
  });

  it('junk is refused only when the report is required', () => {
    const strict = policy('enforce', { allowedRunnerPlatforms: null, requireVersionReport: true });
    expect(evaluateRunnerReport([strict], { agentVersion: 'banana' }).refuse).toBe(true);
  });
});

describe('evaluateRunnerReport: several organizations', () => {
  it('a permissive off organization does not soften a strict enforce one', () => {
    expect(evaluateRunnerReport([policy('off'), policy('enforce')], oldVersion).refuse).toBe(true);
  });

  it('report in one organization and enforce in another refuses only when the enforcing one objects', () => {
    const lenient = policy('enforce', { minRunnerVersion: '1.0.0' });
    expect(evaluateRunnerReport([policy('report'), lenient], oldVersion)).toMatchObject({
      status: 'noncompliant',
      refuse: false,
    });
  });
});

describe('readRunnerPolicy: fail-open on a malformed row', () => {
  it('drops an unparsable minimum version', () => {
    expect(
      readRunnerPolicy({ minRunnerVersion: 'soon', runnerPolicyMode: 'enforce' }),
    ).toMatchObject({
      minRunnerVersion: null,
    });
    expect(readRunnerPolicy({ minRunnerVersion: 42 }).minRunnerVersion).toBeNull();
  });

  it('drops a platform block that is not a non-empty list of known platforms', () => {
    for (const bad of ['linux', {}, [], [1, 2], ['plan9'], null, undefined]) {
      expect(readRunnerPolicy({ allowedRunnerPlatforms: bad }).allowedRunnerPlatforms).toBeNull();
    }
    expect(
      readRunnerPolicy({ allowedRunnerPlatforms: ['linux', 'plan9'] }).allowedRunnerPlatforms,
    ).toEqual(['linux']);
  });

  it('reads an unknown mode as off, so a corrupt column cannot enforce', () => {
    expect(readRunnerPolicy({ runnerPolicyMode: 'ENFORCE' }).runnerPolicyMode).toBe('off');
    expect(readRunnerPolicy({ runnerPolicyMode: 7 }).runnerPolicyMode).toBe('off');
    expect(readRunnerPolicy({}).runnerPolicyMode).toBe('off');
  });

  it('a fully malformed row evaluates to not applicable for any runner', () => {
    const row = readRunnerPolicy({
      minRunnerVersion: {},
      allowedRunnerPlatforms: 'x',
      runnerPolicyMode: 'enforce',
      requireVersionReport: 'yes',
    });
    expect(row.requireVersionReport).toBe(false);
    expect(evaluateRunnerReport([row], oldVersion)).toEqual(RUNNER_NOT_APPLICABLE);
  });
});

describe('RUNNER_POLICY_PLATFORMS', () => {
  it('is exactly the set the runner platform schema can produce', () => {
    const produced = new Set(
      [
        'aix',
        'android',
        'darwin',
        'freebsd',
        'haiku',
        'linux',
        'openbsd',
        'sunos',
        'win32',
        'cygwin',
        'netbsd',
        'windows',
      ].map((value) => agentPlatformSchema.parse(value)),
    );
    expect(new Set(RUNNER_POLICY_PLATFORMS)).toEqual(produced);
  });
});
