import {
  DeploymentPhase,
  DeploymentState,
  type DeploymentStatusDocument,
  DeploymentTriggerMode,
} from '@claw/shared-types';

import { type AuthEmailAdapter } from '../../../auth/adapters/auth-email.adapter';
import { type UsersService } from '../../../users/services/users.service';
import { type DeploymentStatusFileAdapter } from '../../adapters/deployment-status-file.adapter';
import { type GithubActionsAdapter } from '../../adapters/github-actions.adapter';
import { DeploymentService } from '../deployment.service';

const WORKFLOW_URL = 'https://github.com/ihabkhaled/ClawAI/actions/workflows/deploy-production.yml';

const STATUS: DeploymentStatusDocument = {
  schemaVersion: 1,
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
};

describe('DeploymentService', () => {
  const assertSuperAdminActor = jest.fn();
  const read = jest.fn();
  const write = jest.fn();
  const readAutomation = jest.fn();
  const writeAutomation = jest.fn();
  const sendDeploymentNotification = jest.fn();
  const dispatch = jest.fn();
  const isEnabled = jest.fn();
  const defaultRef = jest.fn();
  const workflowUrl = jest.fn();
  const service = new DeploymentService(
    { assertSuperAdminActor } as unknown as UsersService,
    { read, write, readAutomation, writeAutomation } as unknown as DeploymentStatusFileAdapter,
    { sendDeploymentNotification } as unknown as AuthEmailAdapter,
    { dispatch, isEnabled, defaultRef, workflowUrl } as unknown as GithubActionsAdapter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    isEnabled.mockReturnValue(true);
    defaultRef.mockReturnValue('main');
    workflowUrl.mockReturnValue(WORKFLOW_URL);
    readAutomation.mockResolvedValue(null);
  });

  it('authorizes the actor before returning a valid status view', async () => {
    read.mockResolvedValue(STATUS);

    await expect(service.getStatus('super-admin')).resolves.toMatchObject({
      state: DeploymentState.COMPLETED,
      isStale: false,
    });
    expect(assertSuperAdminActor).toHaveBeenCalledWith('super-admin');
  });

  it('returns unknown when the status file is unavailable', async () => {
    read.mockResolvedValue(null);

    await expect(service.getStatus('super-admin')).resolves.toMatchObject({
      state: DeploymentState.UNKNOWN,
      targetSha: null,
    });
  });

  it('sends a notification from a validated terminal status', async () => {
    read.mockResolvedValue(STATUS);
    sendDeploymentNotification.mockResolvedValue(true);

    await expect(service.sendNotification()).resolves.toEqual({ sent: true });
    expect(sendDeploymentNotification).toHaveBeenCalledWith(STATUS);
  });

  it('does not send when no validated status is available', async () => {
    read.mockResolvedValue(null);

    await expect(service.sendNotification()).resolves.toEqual({ sent: false });
    expect(sendDeploymentNotification).not.toHaveBeenCalled();
  });

  it('reports the automatic lane as on when nobody ever paused it', async () => {
    read.mockResolvedValue(STATUS);

    await expect(service.getStatus('super-admin')).resolves.toMatchObject({
      manualTriggerEnabled: true,
      automaticDeployEnabled: true,
    });
  });

  it('reports the manual lane off when the credential set is incomplete', async () => {
    read.mockResolvedValue(STATUS);
    isEnabled.mockReturnValue(false);
    readAutomation.mockResolvedValue({
      schemaVersion: 1,
      enabled: false,
      updatedAt: '2026-08-13T10:49:21Z',
    });

    await expect(service.getStatus('super-admin')).resolves.toMatchObject({
      manualTriggerEnabled: false,
      automaticDeployEnabled: false,
    });
  });

  it('dispatches the release ref with no SHA for the latest mode', async () => {
    read.mockResolvedValue(STATUS);

    await expect(
      service.trigger('super-admin', { mode: DeploymentTriggerMode.LATEST }),
    ).resolves.toEqual({
      dispatched: true,
      mode: DeploymentTriggerMode.LATEST,
      targetSha: null,
      ref: 'main',
      workflowUrl: WORKFLOW_URL,
    });
    expect(assertSuperAdminActor).toHaveBeenCalledWith('super-admin');
    expect(dispatch).toHaveBeenCalledWith({ ref: 'main', targetSha: null });
  });

  it('re-deploys the commit already recorded as live', async () => {
    read.mockResolvedValue(STATUS);

    await expect(
      service.trigger('super-admin', { mode: DeploymentTriggerMode.REDEPLOY }),
    ).resolves.toMatchObject({ targetSha: 'a'.repeat(40) });
    expect(dispatch).toHaveBeenCalledWith({ ref: 'main', targetSha: 'a'.repeat(40) });
  });

  it('refuses to re-deploy when no commit is recorded as live', async () => {
    read.mockResolvedValue({ ...STATUS, deployedSha: null });

    await expect(
      service.trigger('super-admin', { mode: DeploymentTriggerMode.REDEPLOY }),
    ).rejects.toMatchObject({ code: 'DEPLOYMENT_NO_DEPLOYED_SHA' });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches the exact commit an operator pinned', async () => {
    read.mockResolvedValue(STATUS);

    await expect(
      service.trigger('super-admin', {
        mode: DeploymentTriggerMode.SHA,
        targetSha: 'b'.repeat(40),
      }),
    ).resolves.toMatchObject({ targetSha: 'b'.repeat(40) });
    expect(dispatch).toHaveBeenCalledWith({ ref: 'main', targetSha: 'b'.repeat(40) });
  });

  it('refuses to dispatch over a rollout that is still reporting', async () => {
    read.mockResolvedValue({
      ...STATUS,
      state: DeploymentState.RUNNING,
      updatedAt: new Date().toISOString(),
      completedAt: null,
    });

    await expect(
      service.trigger('super-admin', { mode: DeploymentTriggerMode.LATEST }),
    ).rejects.toMatchObject({ code: 'DEPLOYMENT_ALREADY_RUNNING' });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches over a rollout that went quiet past the stale window', async () => {
    read.mockResolvedValue({
      ...STATUS,
      state: DeploymentState.RUNNING,
      updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      completedAt: null,
    });

    await expect(
      service.trigger('super-admin', { mode: DeploymentTriggerMode.LATEST }),
    ).resolves.toMatchObject({ dispatched: true });
  });

  it('refuses to dispatch when manual deployment is unconfigured', async () => {
    defaultRef.mockReturnValue(null);
    workflowUrl.mockReturnValue(null);

    await expect(
      service.trigger('super-admin', { mode: DeploymentTriggerMode.LATEST }),
    ).rejects.toMatchObject({ code: 'DEPLOYMENT_TRIGGER_UNAVAILABLE' });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('clears a stuck rollout as failed and keeps the deployed commit', async () => {
    read.mockResolvedValue({
      ...STATUS,
      state: DeploymentState.RUNNING,
      phase: DeploymentPhase.VERIFYING,
      completedAt: null,
    });

    await expect(service.reset('super-admin')).resolves.toEqual({
      reset: true,
      clearedSha: 'a'.repeat(40),
    });
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({
        state: DeploymentState.FAILED,
        failureCode: 'DEPLOYMENT_RESET',
        deployedSha: 'a'.repeat(40),
      }),
    );
  });

  it('does not rewrite a rollout that is not running', async () => {
    read.mockResolvedValue(STATUS);

    await expect(service.reset('super-admin')).resolves.toEqual({
      reset: false,
      clearedSha: null,
    });
    expect(write).not.toHaveBeenCalled();
  });

  it('persists the automatic-deploy switch', async () => {
    await expect(service.setAutomation('super-admin', { enabled: false })).resolves.toEqual({
      manualTriggerEnabled: true,
      automaticDeployEnabled: false,
    });
    expect(writeAutomation).toHaveBeenCalledWith(
      expect.objectContaining({ schemaVersion: 1, enabled: false }),
    );
  });

  it('does not send for a non-terminal deployment', async () => {
    read.mockResolvedValue({
      ...STATUS,
      state: DeploymentState.RUNNING,
      phase: DeploymentPhase.VERIFYING,
      completedAt: null,
    });

    await expect(service.sendNotification()).resolves.toEqual({ sent: false });
    expect(sendDeploymentNotification).not.toHaveBeenCalled();
  });
});
