import { DeploymentPhase, DeploymentState } from '@claw/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DeploymentStatusContent } from '@/components/admin/deployment/deployment-status-content';

const status = {
  schemaVersion: 1 as const,
  state: DeploymentState.COMPLETED,
  phase: DeploymentPhase.COMPLETED,
  targetSha: 'a'.repeat(40),
  previousSha: 'b'.repeat(40),
  deployedSha: 'a'.repeat(40),
  version: '1.15.0',
  services: ['auth-service', 'frontend'],
  currentService: null,
  startedAt: '2026-08-13T10:29:58Z',
  updatedAt: '2026-08-13T10:49:21Z',
  completedAt: '2026-08-13T10:49:21Z',
  workflowUrl: 'https://github.com/ihabkhaled/ClawAI/actions/runs/123',
  failureCode: null,
  isStale: false,
};

describe('DeploymentStatusContent', () => {
  it('shows outcome, version, commit, services, and the authoritative workflow', () => {
    render(<DeploymentStatusContent status={status} locale="en" t={(key) => key} />);

    expect(screen.getAllByText('adminDeployment.state.completed')).toHaveLength(2);
    expect(screen.getByText('1.15.0')).toBeInTheDocument();
    expect(screen.getByText('aaaaaaaaaaaa')).toBeInTheDocument();
    expect(screen.getByText('auth-service')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'adminDeployment.openWorkflow' })).toHaveAttribute(
      'href',
      status.workflowUrl,
    );
  });

  it('flags stale running status without hiding the recorded phase', () => {
    render(
      <DeploymentStatusContent
        status={{
          ...status,
          state: DeploymentState.RUNNING,
          phase: DeploymentPhase.VERIFYING,
          isStale: true,
        }}
        locale="en"
        t={(key) => key}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('adminDeployment.staleWarning');
    expect(screen.getAllByText('adminDeployment.phase.verifying').length).toBeGreaterThan(0);
  });
});
