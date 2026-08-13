import { DeploymentPhase, DeploymentState } from '@claw/shared-types';

import {
  parseDeploymentStatus,
  toDeploymentStatusView,
  unknownDeploymentStatusView,
} from '../deployment-status.utility';

const SHA = 'a'.repeat(40);

function validDocument(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    state: DeploymentState.RUNNING,
    phase: DeploymentPhase.VERIFYING,
    targetSha: SHA,
    previousSha: null,
    deployedSha: null,
    version: '1.15.0',
    services: ['auth-service', 'frontend'],
    currentService: 'frontend',
    startedAt: '2026-08-13T10:29:58Z',
    updatedAt: '2026-08-13T10:49:21Z',
    completedAt: null,
    workflowUrl: 'https://github.com/ihabkhaled/ClawAI/actions/runs/123',
    failureCode: null,
  };
}

describe('deployment status utility', () => {
  it('accepts the bounded status document', () => {
    expect(parseDeploymentStatus(validDocument())).toMatchObject({ targetSha: SHA });
  });

  it.each([
    { targetSha: 'short' },
    { workflowUrl: 'https://evil.example/actions/1' },
    { services: ['frontend', '../../etc/passwd'] },
    { failureCode: 'raw stack trace' },
  ])('rejects unsafe status fields: %o', (override) => {
    expect(parseDeploymentStatus({ ...validDocument(), ...override })).toBeNull();
  });

  it('marks only an inactive running document stale after thirty minutes', () => {
    const parsed = parseDeploymentStatus(validDocument());
    expect(parsed).not.toBeNull();
    if (parsed === null) return;
    expect(toDeploymentStatusView(parsed, Date.parse('2026-08-13T11:20:00Z')).isStale).toBe(true);
    expect(
      toDeploymentStatusView(
        { ...parsed, state: DeploymentState.COMPLETED },
        Date.parse('2026-08-14T11:20:00Z'),
      ).isStale,
    ).toBe(false);
  });

  it('returns a bounded unknown view when no readable status exists', () => {
    expect(unknownDeploymentStatusView()).toEqual({
      schemaVersion: 1,
      state: DeploymentState.UNKNOWN,
      phase: DeploymentPhase.UNKNOWN,
      targetSha: null,
      previousSha: null,
      deployedSha: null,
      version: null,
      services: [],
      currentService: null,
      startedAt: null,
      updatedAt: null,
      completedAt: null,
      workflowUrl: null,
      failureCode: null,
      isStale: false,
    });
  });
});
