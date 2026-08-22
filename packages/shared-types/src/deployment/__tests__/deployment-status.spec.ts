import { DeploymentPhase, DeploymentState, DeploymentTriggerMode } from '../index';

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

  it('exposes exactly the three manual deployment modes the admin page offers', () => {
    // The backend DTO and the frontend buttons both switch on these values;
    // adding a fourth without wiring both sides would silently do nothing.
    expect(Object.values(DeploymentTriggerMode)).toEqual(['latest', 'redeploy', 'sha']);
  });
});
