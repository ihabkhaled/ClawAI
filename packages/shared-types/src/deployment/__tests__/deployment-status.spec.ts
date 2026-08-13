import { DeploymentPhase, DeploymentState } from '../index';

describe('deployment status contract', () => {
  it('exposes bounded lifecycle values shared by deployment and UI consumers', () => {
    expect(Object.values(DeploymentState)).toEqual(['unknown', 'running', 'completed', 'failed']);
    expect(Object.values(DeploymentPhase)).toEqual([
      'unknown',
      'preparing',
      'planning',
      'building',
      'deploying',
      'reloading_nginx',
      'verifying',
      'finalizing',
      'completed',
    ]);
  });
});
