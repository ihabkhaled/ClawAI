import { DeploymentPhase, DeploymentState, DeploymentTriggerMode } from '@claw/shared-types';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeploymentControlPanel } from '@/components/admin/deployment/deployment-control-panel';
import type { UseDeploymentActionsResult } from '@/types/deployment-page.types';

const baseStatus = {
  schemaVersion: 1 as const,
  state: DeploymentState.COMPLETED,
  phase: DeploymentPhase.COMPLETED,
  targetSha: 'a'.repeat(40),
  previousSha: null,
  deployedSha: 'a'.repeat(40),
  version: '1.15.0',
  services: ['frontend'],
  currentService: null,
  startedAt: '2026-08-13T10:29:58Z',
  updatedAt: '2026-08-13T10:49:21Z',
  completedAt: '2026-08-13T10:49:21Z',
  workflowUrl: null,
  failureCode: null,
  isStale: false,
  manualTriggerEnabled: true,
  automaticDeployEnabled: true,
};

function actions(overrides: Partial<UseDeploymentActionsResult> = {}): UseDeploymentActionsResult {
  return {
    targetSha: '',
    setTargetSha: vi.fn(),
    isShaValid: false,
    pendingMode: null,
    isResetting: false,
    isSwitchingAutomation: false,
    isBusy: false,
    deployLatest: vi.fn(),
    redeploy: vi.fn(),
    deploySha: vi.fn(),
    reset: vi.fn(),
    setAutomaticDeploy: vi.fn(),
    ...overrides,
  };
}

describe('DeploymentControlPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers both lanes to an operator on a fully configured box', () => {
    render(<DeploymentControlPanel t={(key) => key} status={baseStatus} actions={actions()} />);

    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByText('adminDeployment.automaticOn')).toBeInTheDocument();
    expect(screen.getByText('adminDeployment.deployLatest')).toBeInTheDocument();
    expect(screen.getByText('adminDeployment.redeploy')).toBeInTheDocument();
  });

  it('starts a manual rollout from the button an operator pressed', () => {
    const control = actions();
    render(<DeploymentControlPanel t={(key) => key} status={baseStatus} actions={control} />);

    fireEvent.click(screen.getByText('adminDeployment.deployLatest'));
    expect(control.deployLatest).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByText('adminDeployment.redeploy'));
    expect(control.redeploy).toHaveBeenCalledOnce();
  });

  it('pauses the automatic lane from the switch', () => {
    const control = actions();
    render(<DeploymentControlPanel t={(key) => key} status={baseStatus} actions={control} />);

    fireEvent.click(screen.getByRole('switch'));
    expect(control.setAutomaticDeploy).toHaveBeenCalledWith(false);
  });

  it('explains a paused lane rather than implying production still follows main', () => {
    render(
      <DeploymentControlPanel
        t={(key) => key}
        status={{ ...baseStatus, automaticDeployEnabled: false }}
        actions={actions()}
      />,
    );

    expect(screen.getByRole('switch')).not.toBeChecked();
    expect(screen.getByText('adminDeployment.automaticOffHint')).toBeInTheDocument();
  });

  it('hides the manual controls when the box has no dispatch credentials', () => {
    render(
      <DeploymentControlPanel
        t={(key) => key}
        status={{ ...baseStatus, manualTriggerEnabled: false }}
        actions={actions()}
      />,
    );

    expect(screen.getByText('adminDeployment.manualUnavailable')).toBeInTheDocument();
    expect(screen.queryByText('adminDeployment.deployLatest')).not.toBeInTheDocument();
  });

  it('refuses to re-deploy when nothing is recorded as live', () => {
    render(
      <DeploymentControlPanel
        t={(key) => key}
        status={{ ...baseStatus, deployedSha: null }}
        actions={actions()}
      />,
    );

    expect(screen.getByText('adminDeployment.redeploy').closest('button')).toBeDisabled();
    expect(screen.getByText('adminDeployment.redeployUnavailable')).toBeInTheDocument();
  });

  it('offers recovery only for a rollout that is stuck or still running', () => {
    const { rerender } = render(
      <DeploymentControlPanel t={(key) => key} status={baseStatus} actions={actions()} />,
    );
    expect(screen.queryByText('adminDeployment.reset')).not.toBeInTheDocument();

    rerender(
      <DeploymentControlPanel
        t={(key) => key}
        status={{ ...baseStatus, state: DeploymentState.RUNNING, isStale: true }}
        actions={actions()}
      />,
    );
    expect(screen.getByText('adminDeployment.recoveryTitle')).toBeInTheDocument();
  });

  it('clears a stuck rollout from the recovery button', () => {
    const control = actions();
    render(
      <DeploymentControlPanel
        t={(key) => key}
        status={{ ...baseStatus, state: DeploymentState.RUNNING, isStale: true }}
        actions={control}
      />,
    );

    fireEvent.click(screen.getByText('adminDeployment.reset'));
    expect(control.reset).toHaveBeenCalledOnce();
  });

  it('locks every control while one is in flight', () => {
    render(
      <DeploymentControlPanel
        t={(key) => key}
        status={{ ...baseStatus, state: DeploymentState.RUNNING, isStale: true }}
        actions={actions({ isBusy: true, pendingMode: DeploymentTriggerMode.LATEST })}
      />,
    );

    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByText('adminDeployment.deployLatest').closest('button')).toBeDisabled();
    expect(screen.getByText('adminDeployment.reset').closest('button')).toBeDisabled();
  });

  it('enables the exact-commit button only for a full sha', () => {
    const { rerender } = render(
      <DeploymentControlPanel
        t={(key) => key}
        status={baseStatus}
        actions={actions({ targetSha: 'main', isShaValid: false })}
      />,
    );
    expect(screen.getByText('adminDeployment.deploySha').closest('button')).toBeDisabled();
    expect(screen.getByLabelText('adminDeployment.shaLabel')).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    rerender(
      <DeploymentControlPanel
        t={(key) => key}
        status={baseStatus}
        actions={actions({ targetSha: 'b'.repeat(40), isShaValid: true })}
      />,
    );
    expect(screen.getByText('adminDeployment.deploySha').closest('button')).toBeEnabled();
  });
});
