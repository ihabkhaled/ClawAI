import {
  DeploymentPhase,
  DeploymentState,
  type DeploymentStatusDocument,
} from '@claw/shared-types';

import { type AuthEmailAdapter } from '../../../auth/adapters/auth-email.adapter';
import { type UsersService } from '../../../users/services/users.service';
import { type DeploymentStatusFileAdapter } from '../../adapters/deployment-status-file.adapter';
import { DeploymentService } from '../deployment.service';

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
  const sendDeploymentNotification = jest.fn();
  const service = new DeploymentService(
    { assertSuperAdminActor } as unknown as UsersService,
    { read } as unknown as DeploymentStatusFileAdapter,
    { sendDeploymentNotification } as unknown as AuthEmailAdapter,
  );

  beforeEach(() => jest.clearAllMocks());

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
