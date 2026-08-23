import {
  DeploymentCredentialSource,
  DeploymentRunConclusion,
  DeploymentRunStatus,
  DeploymentState,
  type DeploymentStatusView,
} from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { DeploymentTroubleshootingSituation } from '@/enums/deployment-troubleshooting-situation.enum';
import {
  resolveTroubleshootingSituation,
  troubleshootingSteps,
} from '@/utilities/deployment-troubleshooting.utility';

function status(overrides: Partial<DeploymentStatusView> = {}): DeploymentStatusView {
  return {
    schemaVersion: 1,
    state: DeploymentState.COMPLETED,
    phase: 'completed',
    targetSha: 'a'.repeat(40),
    previousSha: null,
    deployedSha: 'a'.repeat(40),
    version: '1.15.0',
    services: [],
    currentService: null,
    startedAt: null,
    updatedAt: null,
    completedAt: null,
    workflowUrl: null,
    failureCode: null,
    isStale: false,
    manualTriggerEnabled: true,
    automaticDeployEnabled: true,
    credentials: {
      source: DeploymentCredentialSource.DATABASE,
      repository: 'ihabkhaled/ClawAI',
      ref: 'main',
      tokenLastFour: 'abcd',
      updatedAt: null,
      isUsable: true,
    },
    ...overrides,
  } as DeploymentStatusView;
}

describe('deployment troubleshooting', () => {
  it('says nothing when the pipeline is healthy', () => {
    expect(
      resolveTroubleshootingSituation(
        status(),
        DeploymentRunStatus.COMPLETED,
        DeploymentRunConclusion.SUCCESS,
      ),
    ).toBeNull();
  });

  it('stays quiet while a run is legitimately in progress', () => {
    expect(
      resolveTroubleshootingSituation(
        status({ state: DeploymentState.RUNNING }),
        DeploymentRunStatus.IN_PROGRESS,
        null,
      ),
    ).toBeNull();
  });

  it('catches the case the operator cannot explain: workflow dead, server still running', () => {
    expect(
      resolveTroubleshootingSituation(
        status({ state: DeploymentState.RUNNING }),
        DeploymentRunStatus.COMPLETED,
        DeploymentRunConclusion.FAILURE,
      ),
    ).toBe(DeploymentTroubleshootingSituation.ABANDONED);
  });

  it('prefers the abandoned diagnosis over plain staleness', () => {
    expect(
      resolveTroubleshootingSituation(
        status({ state: DeploymentState.RUNNING, isStale: true }),
        DeploymentRunStatus.COMPLETED,
        DeploymentRunConclusion.FAILURE,
      ),
    ).toBe(DeploymentTroubleshootingSituation.ABANDONED);
  });

  it('reports staleness when GitHub says nothing useful', () => {
    expect(
      resolveTroubleshootingSituation(
        status({ state: DeploymentState.RUNNING, isStale: true }),
        null,
        null,
      ),
    ).toBe(DeploymentTroubleshootingSituation.STALE);
  });

  it('reports a plain failure', () => {
    expect(
      resolveTroubleshootingSituation(
        status({ state: DeploymentState.FAILED }),
        DeploymentRunStatus.COMPLETED,
        DeploymentRunConclusion.FAILURE,
      ),
    ).toBe(DeploymentTroubleshootingSituation.FAILED);
  });

  it('does not call a cancelled or skipped run a failure', () => {
    expect(
      resolveTroubleshootingSituation(
        status(),
        DeploymentRunStatus.COMPLETED,
        DeploymentRunConclusion.SKIPPED,
      ),
    ).toBeNull();
  });

  it('reports an unconfigured lane last, once nothing else is wrong', () => {
    expect(
      resolveTroubleshootingSituation(
        status({ manualTriggerEnabled: false }),
        DeploymentRunStatus.COMPLETED,
        DeploymentRunConclusion.SUCCESS,
      ),
    ).toBe(DeploymentTroubleshootingSituation.UNCONFIGURED);
  });

  it('reads the log before it re-runs anything', () => {
    for (const situation of [
      DeploymentTroubleshootingSituation.ABANDONED,
      DeploymentTroubleshootingSituation.FAILED,
    ]) {
      const steps = troubleshootingSteps(situation);
      expect(steps.indexOf('readLog')).toBeLessThan(steps.indexOf('redeploy'));
    }
  });
});
