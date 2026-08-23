import {
  DeploymentCredentialSource,
  DeploymentPhase,
  DeploymentRunUnavailableReason,
  DeploymentState,
  type DeploymentStatusDocument,
  DeploymentTriggerMode,
} from '@claw/shared-types';

import { AppConfig, type AppConfigType } from '../../../../app/config/app.config';
import { type AuthEmailAdapter } from '../../../auth/adapters/auth-email.adapter';
import { type UsersService } from '../../../users/services/users.service';
import { type DeploymentStatusFileAdapter } from '../../adapters/deployment-status-file.adapter';
import { type GithubActionsAdapter } from '../../adapters/github-actions.adapter';
import { type DeploymentCredentialRepository } from '../../repositories/deployment-credential.repository';
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
  const resolve = jest.fn();
  const latestRun = jest.fn();
  const workflowUrl = jest.fn();
  const findCredential = jest.fn();
  const upsertCredential = jest.fn();
  const deleteCredential = jest.fn();
  const service = new DeploymentService(
    { assertSuperAdminActor } as unknown as UsersService,
    { read, write, readAutomation, writeAutomation } as unknown as DeploymentStatusFileAdapter,
    { sendDeploymentNotification } as unknown as AuthEmailAdapter,
    { dispatch, resolve, latestRun, workflowUrl } as unknown as GithubActionsAdapter,
    {
      find: findCredential,
      upsert: upsertCredential,
      delete: deleteCredential,
    } as unknown as DeploymentCredentialRepository,
  );

  const RESOLVED = {
    token: 'ghp_token',
    repository: 'ihabkhaled/ClawAI',
    ref: 'main',
    source: DeploymentCredentialSource.ENVIRONMENT,
    tokenLastFour: 'oken',
    updatedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(AppConfig, 'get')
      .mockReturnValue({ ENCRYPTION_KEY: 'a'.repeat(64) } as unknown as AppConfigType);
    resolve.mockResolvedValue(RESOLVED);
    workflowUrl.mockReturnValue(WORKFLOW_URL);
    readAutomation.mockResolvedValue(null);
    findCredential.mockResolvedValue(null);
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
    resolve.mockResolvedValue(null);
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
    resolve.mockResolvedValue(null);

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

  it('reports live run progress from GitHub', async () => {
    latestRun.mockResolvedValue({ id: 1, currentStep: { stepName: 'Deploy over SSH' } });

    await expect(service.getRunProgress('super-admin')).resolves.toMatchObject({
      available: true,
      reason: null,
    });
  });

  it('says progress is unavailable because nothing is configured', async () => {
    resolve.mockResolvedValue(null);

    await expect(service.getRunProgress('super-admin')).resolves.toEqual({
      available: false,
      reason: DeploymentRunUnavailableReason.NOT_CONFIGURED,
      run: null,
    });
    expect(latestRun).not.toHaveBeenCalled();
  });

  it('says progress is unavailable because GitHub could not be read', async () => {
    latestRun.mockResolvedValue(null);

    await expect(service.getRunProgress('super-admin')).resolves.toEqual({
      available: false,
      reason: DeploymentRunUnavailableReason.UNREACHABLE,
      run: null,
    });
  });

  it('encrypts a saved token and never returns it', async () => {
    const view = await service.saveCredentials('super-admin', {
      repository: 'ihabkhaled/ClawAI',
      ref: 'main',
      token: 'ghp_a_real_looking_token',
    });

    const [written] = upsertCredential.mock.calls[0] as [Record<string, string>];
    expect(written.encryptedToken).not.toContain('ghp_a_real_looking_token');
    expect(written.tokenLastFour).toBe('oken');
    expect(written.updatedByUserId).toBe('super-admin');
    expect(JSON.stringify(view)).not.toContain('ghp_a_real_looking_token');
  });

  it('keeps the stored token when only the repository or ref changes', async () => {
    findCredential.mockResolvedValue({
      encryptedToken: 'existing-ciphertext',
      tokenLastFour: 'last',
      updatedAt: new Date('2026-08-13T10:29:58Z'),
      repository: 'ihabkhaled/ClawAI',
      ref: 'main',
    });

    await service.saveCredentials('super-admin', {
      repository: 'ihabkhaled/ClawAI',
      ref: 'release',
    });

    expect(upsertCredential).toHaveBeenCalledWith(
      expect.objectContaining({ encryptedToken: 'existing-ciphertext', tokenLastFour: 'last' }),
    );
  });

  it('requires a token the first time credentials are saved', async () => {
    await expect(
      service.saveCredentials('super-admin', { repository: 'ihabkhaled/ClawAI', ref: 'main' }),
    ).rejects.toMatchObject({ code: 'DEPLOYMENT_TOKEN_REQUIRED' });
    expect(upsertCredential).not.toHaveBeenCalled();
  });

  it('reports the fallback source after clearing the stored credentials', async () => {
    deleteCredential.mockResolvedValue(true);

    await expect(service.clearCredentials('super-admin')).resolves.toEqual({
      cleared: true,
      source: DeploymentCredentialSource.ENVIRONMENT,
    });
  });

  it('reports an unusable stored row rather than pretending nothing is configured', async () => {
    resolve.mockResolvedValue(null);
    findCredential.mockResolvedValue({
      repository: 'ihabkhaled/ClawAI',
      ref: 'main',
      tokenLastFour: 'last',
      updatedAt: new Date('2026-08-13T10:29:58Z'),
    });
    read.mockResolvedValue(STATUS);

    await expect(service.getStatus('super-admin')).resolves.toMatchObject({
      manualTriggerEnabled: false,
      credentials: { source: DeploymentCredentialSource.DATABASE, isUsable: false },
    });
  });

  it('persists the automatic-deploy switch', async () => {
    await expect(service.setAutomation('super-admin', { enabled: false })).resolves.toMatchObject({
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
