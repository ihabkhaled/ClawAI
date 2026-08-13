import { DeploymentInternalController } from '../deployment-internal.controller';

describe('DeploymentInternalController', () => {
  it('forwards notification delivery to the service', async () => {
    const sendNotification = jest.fn().mockResolvedValue({ sent: true });
    const controller = new DeploymentInternalController({ sendNotification } as never);

    await expect(controller.notify()).resolves.toEqual({ sent: true });
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });
});
