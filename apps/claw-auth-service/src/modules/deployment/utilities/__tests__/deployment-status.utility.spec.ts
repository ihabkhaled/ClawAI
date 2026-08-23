import { DeploymentCredentialSource, DeploymentPhase, DeploymentState } from '@claw/shared-types';

import { type DeploymentViewFlags } from '../../types/deployment-view.types';
import {
  parseDeploymentAutomation,
  parseDeploymentStatus,
  toDeploymentStatusView,
  toResetDeploymentStatus,
  unknownDeploymentStatusView,
} from '../deployment-status.utility';

const SHA = 'a'.repeat(40);
const CREDENTIALS = {
  source: DeploymentCredentialSource.ENVIRONMENT,
  repository: 'ihabkhaled/ClawAI',
  ref: 'main',
  tokenLastFour: 'oken',
  updatedAt: null,
  isUsable: true,
};
const FLAGS: DeploymentViewFlags = {
  manualTriggerEnabled: true,
  automaticDeployEnabled: true,
  credentials: CREDENTIALS,
};
const NO_CREDENTIALS = {
  source: DeploymentCredentialSource.NONE,
  repository: null,
  ref: null,
  tokenLastFour: null,
  updatedAt: null,
  isUsable: false,
};

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
    expect(toDeploymentStatusView(parsed, FLAGS, Date.parse('2026-08-13T11:20:00Z')).isStale).toBe(
      true,
    );
    expect(
      toDeploymentStatusView(
        { ...parsed, state: DeploymentState.COMPLETED },
        FLAGS,
        Date.parse('2026-08-14T11:20:00Z'),
      ).isStale,
    ).toBe(false);
  });

  it('returns a bounded unknown view when no readable status exists', () => {
    expect(
      unknownDeploymentStatusView({
        manualTriggerEnabled: false,
        automaticDeployEnabled: false,
        credentials: NO_CREDENTIALS,
      }),
    ).toEqual({
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
      manualTriggerEnabled: false,
      automaticDeployEnabled: false,
      credentials: NO_CREDENTIALS,
    });
  });

  it('carries the operational flags onto a parsed view', () => {
    const parsed = parseDeploymentStatus(validDocument());
    expect(parsed).not.toBeNull();
    if (parsed === null) return;
    expect(
      toDeploymentStatusView(parsed, {
        manualTriggerEnabled: true,
        automaticDeployEnabled: false,
        credentials: CREDENTIALS,
      }),
    ).toMatchObject({ manualTriggerEnabled: true, automaticDeployEnabled: false });
  });

  it('accepts the reset failure code the admin reset writes', () => {
    expect(
      parseDeploymentStatus({
        ...validDocument(),
        state: DeploymentState.FAILED,
        failureCode: 'DEPLOYMENT_RESET',
      }),
    ).toMatchObject({ failureCode: 'DEPLOYMENT_RESET' });
  });

  it('rewrites a stuck rollout as failed without moving any recorded commit', () => {
    const parsed = parseDeploymentStatus({ ...validDocument(), deployedSha: SHA });
    expect(parsed).not.toBeNull();
    if (parsed === null) return;

    const reset = toResetDeploymentStatus(parsed, '2026-08-13T12:00:00Z');

    expect(reset).toMatchObject({
      state: DeploymentState.FAILED,
      failureCode: 'DEPLOYMENT_RESET',
      currentService: null,
      completedAt: '2026-08-13T12:00:00Z',
      updatedAt: '2026-08-13T12:00:00Z',
      targetSha: SHA,
      deployedSha: SHA,
    });
    expect(parseDeploymentStatus(reset)).not.toBeNull();
  });

  it('parses the automation switch and rejects anything else', () => {
    expect(
      parseDeploymentAutomation({
        schemaVersion: 1,
        enabled: false,
        updatedAt: '2026-08-13T12:00:00Z',
      }),
    ).toMatchObject({ enabled: false });
    expect(parseDeploymentAutomation({ schemaVersion: 1, enabled: 'no' })).toBeNull();
  });
});
