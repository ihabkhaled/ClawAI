import { DeploymentTriggerMode, Permission } from '@claw/shared-types';

import { PERMISSIONS_KEY } from '../../../../app/decorators/permissions.decorator';
import { UserRole } from '../../../../common/enums';
import {
  setDeploymentAutomationSchema,
  triggerDeploymentSchema,
} from '../../dto/deployment-trigger.dto';
import { DeploymentAdminController } from '../deployment-admin.controller';

const ACTOR = { id: 'super-admin', role: UserRole.ADMIN };

describe('DeploymentAdminController', () => {
  const getStatus = jest.fn();
  const trigger = jest.fn();
  const reset = jest.fn();
  const setAutomation = jest.fn();
  const controller = new DeploymentAdminController({
    getStatus,
    trigger,
    reset,
    setAutomation,
  } as never);

  beforeEach(() => jest.clearAllMocks());

  it('forwards the authenticated actor id', async () => {
    getStatus.mockResolvedValue({ state: 'unknown' });

    await controller.get(ACTOR as never);

    expect(getStatus).toHaveBeenCalledWith('super-admin');
  });

  it('forwards the actor and the validated trigger request', async () => {
    trigger.mockResolvedValue({ dispatched: true });

    await controller.trigger(ACTOR as never, { mode: DeploymentTriggerMode.LATEST });

    expect(trigger).toHaveBeenCalledWith('super-admin', { mode: DeploymentTriggerMode.LATEST });
  });

  it('forwards the actor when clearing a stuck rollout', async () => {
    reset.mockResolvedValue({ reset: true, clearedSha: null });

    await controller.reset(ACTOR as never);

    expect(reset).toHaveBeenCalledWith('super-admin');
  });

  it('forwards the actor when switching the automatic lane', async () => {
    setAutomation.mockResolvedValue({
      manualTriggerEnabled: true,
      automaticDeployEnabled: false,
    });

    await controller.setAutomation(ACTOR as never, { enabled: false });

    expect(setAutomation).toHaveBeenCalledWith('super-admin', { enabled: false });
  });

  it.each([
    DeploymentAdminController.prototype.get,
    DeploymentAdminController.prototype.trigger,
    DeploymentAdminController.prototype.reset,
    DeploymentAdminController.prototype.setAutomation,
  ])('requires the system-view permission on every route', (handler) => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([Permission.ADMIN_SYSTEM_VIEW]);
  });

  it('requires a 40-character sha for the sha mode and rejects one everywhere else', () => {
    expect(
      triggerDeploymentSchema.safeParse({
        mode: DeploymentTriggerMode.SHA,
        targetSha: 'a'.repeat(40),
      }).success,
    ).toBe(true);
    expect(triggerDeploymentSchema.safeParse({ mode: DeploymentTriggerMode.SHA }).success).toBe(
      false,
    );
    expect(
      triggerDeploymentSchema.safeParse({ mode: DeploymentTriggerMode.SHA, targetSha: 'main' })
        .success,
    ).toBe(false);
    expect(
      triggerDeploymentSchema.safeParse({
        mode: DeploymentTriggerMode.LATEST,
        targetSha: 'a'.repeat(40),
      }).success,
    ).toBe(false);
  });

  it('accepts only a boolean automation switch', () => {
    expect(setDeploymentAutomationSchema.safeParse({ enabled: true }).success).toBe(true);
    expect(setDeploymentAutomationSchema.safeParse({ enabled: 'true' }).success).toBe(false);
  });
});
