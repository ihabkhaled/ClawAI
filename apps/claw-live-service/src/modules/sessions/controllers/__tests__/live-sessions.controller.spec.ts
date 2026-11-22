import { IS_PUBLIC_KEY } from '@claw/shared-auth';

import { LiveSessionsController } from '../live-sessions.controller';
import { LiveSourcesController } from '../live-sources.controller';
import { LiveUsageController } from '../live-usage.controller';

const user = { id: 'u1' } as never;

describe('live session controllers', () => {
  it('delegate every route to the service with the caller id', async () => {
    const service = {
      create: vi.fn(),
      heartbeat: vi.fn(),
      approveCredits: vi.fn(),
      update: vi.fn(),
      close: vi.fn(),
      closeWithToken: vi.fn(),
      resolve: vi.fn(),
    };
    const controller = new LiveSessionsController(service as never);
    await controller.create(user, { url: 'u' } as never);
    await controller.heartbeat(user, 's1', {} as never);
    await controller.approveCredits(user, 's1', {});
    await controller.update(user, 's1', { language: 'fr' });
    await controller.close(user, 's1');
    await controller.closeByBeacon('s1', {} as never);
    expect(service.create).toHaveBeenCalledWith('u1', { url: 'u' });
    expect(service.heartbeat).toHaveBeenCalledWith('s1', 'u1', {});
    expect(service.approveCredits).toHaveBeenCalledWith('s1', 'u1', {});
    expect(service.update).toHaveBeenCalledWith('s1', 'u1', { language: 'fr' });
    expect(service.close).toHaveBeenCalledWith('s1', 'u1');
    expect(service.closeWithToken).toHaveBeenCalledWith('s1', {});

    await new LiveSourcesController(service as never).resolve(user, { url: 'x' });
    expect(service.resolve).toHaveBeenCalledWith('x', 'u1');
  });

  it('marks only the beacon close as public', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, LiveSessionsController.prototype.closeByBeacon)).toBe(
      true,
    );
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, LiveSessionsController.prototype.close),
    ).toBeUndefined();
  });

  it('serves usage from billing', async () => {
    const billing = { usage: vi.fn().mockResolvedValue({ month: '2026-11' }) };
    await expect(new LiveUsageController(billing as never).usage(user)).resolves.toEqual({
      month: '2026-11',
    });
  });
});
