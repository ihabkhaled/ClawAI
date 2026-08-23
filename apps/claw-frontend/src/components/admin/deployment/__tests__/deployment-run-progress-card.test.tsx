import {
  DeploymentRunConclusion,
  DeploymentRunStatus,
  DeploymentRunUnavailableReason,
} from '@claw/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DeploymentRunProgressCard } from '@/components/admin/deployment/deployment-run-progress-card';

function run(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    runNumber: 1122,
    status: DeploymentRunStatus.IN_PROGRESS,
    conclusion: null,
    url: 'https://github.com/ihabkhaled/ClawAI/actions/runs/1',
    headSha: 'a'.repeat(40),
    triggerSource: null,
    startedAt: '2026-08-22T14:43:55Z',
    updatedAt: '2026-08-22T14:45:00Z',
    jobs: [
      {
        id: 2,
        name: 'Deploy',
        status: DeploymentRunStatus.IN_PROGRESS,
        conclusion: null,
        url: 'https://github.com/ihabkhaled/ClawAI/actions/runs/1/job/2',
        startedAt: '2026-08-22T14:43:57Z',
        completedAt: null,
        steps: [
          {
            number: 1,
            name: 'Configure SSH',
            status: DeploymentRunStatus.COMPLETED,
            conclusion: DeploymentRunConclusion.SUCCESS,
            startedAt: null,
            completedAt: null,
          },
          {
            number: 2,
            name: 'Deploy over SSH',
            status: DeploymentRunStatus.IN_PROGRESS,
            conclusion: null,
            startedAt: null,
            completedAt: null,
          },
        ],
      },
    ],
    currentStep: {
      jobName: 'Deploy',
      stepName: 'Deploy over SSH',
      jobUrl: 'https://github.com/ihabkhaled/ClawAI/actions/runs/1/job/2',
    },
    failedStep: null,
    ...overrides,
  };
}

describe('DeploymentRunProgressCard', () => {
  it('names every step and highlights the one running now', () => {
    render(
      <DeploymentRunProgressCard
        t={(key) => key}
        locale="en"
        progress={{
          progress: { available: true, reason: null, run: run() } as never,
          isLoading: false,
        }}
      />,
    );

    expect(screen.getByText('Configure SSH')).toBeInTheDocument();
    expect(screen.getAllByText('Deploy over SSH').length).toBeGreaterThan(0);
    expect(screen.getByText('adminDeployment.runNowRunning')).toBeInTheDocument();
    // The running step is the current one for assistive technology too.
    expect(document.querySelector('[aria-current="step"]')).not.toBeNull();
  });

  it('points at the failing step and its log', () => {
    render(
      <DeploymentRunProgressCard
        t={(key) => key}
        locale="en"
        progress={{
          progress: {
            available: true,
            reason: null,
            run: run({
              status: DeploymentRunStatus.COMPLETED,
              conclusion: DeploymentRunConclusion.FAILURE,
              currentStep: null,
              failedStep: {
                jobName: 'Deploy',
                stepName: 'Deploy over SSH',
                jobUrl: 'https://github.com/ihabkhaled/ClawAI/actions/runs/1/job/2',
              },
            }),
          } as never,
          isLoading: false,
        }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('adminDeployment.runFailedAt');
    expect(screen.getByRole('link', { name: /runReadLog/u })).toHaveAttribute(
      'href',
      'https://github.com/ihabkhaled/ClawAI/actions/runs/1/job/2',
    );
  });

  it('explains an unavailable read rather than showing an empty panel', () => {
    render(
      <DeploymentRunProgressCard
        t={(key) => key}
        locale="en"
        progress={{
          progress: {
            available: false,
            reason: DeploymentRunUnavailableReason.UNREACHABLE,
            run: null,
          },
          isLoading: false,
        }}
      />,
    );

    expect(screen.getByText('adminDeployment.runUnavailable.unreachable')).toBeInTheDocument();
  });

  it('stops promising auto-refresh once the run is done', () => {
    render(
      <DeploymentRunProgressCard
        t={(key) => key}
        locale="en"
        progress={{
          progress: {
            available: true,
            reason: null,
            run: run({
              status: DeploymentRunStatus.COMPLETED,
              conclusion: DeploymentRunConclusion.SUCCESS,
              currentStep: null,
            }),
          } as never,
          isLoading: false,
        }}
      />,
    );

    expect(screen.queryByText('adminDeployment.runAutoRefresh')).not.toBeInTheDocument();
  });
});
