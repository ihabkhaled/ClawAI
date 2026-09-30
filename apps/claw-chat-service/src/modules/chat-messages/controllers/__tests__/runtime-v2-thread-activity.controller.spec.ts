import { RequestMethod } from '@nestjs/common';
import { vi } from 'vitest';

import { EntityNotFoundException } from '../../../../common/errors';
import { RuntimeV2ThreadActivityController } from '../runtime-v2-thread-activity.controller';

describe('RuntimeV2ThreadActivityController', () => {
  it('is GET /chat-threads/:id/active-run', () => {
    const handler = Object.getOwnPropertyDescriptor(
      RuntimeV2ThreadActivityController.prototype,
      'getActiveRun',
    )?.value;

    expect(Reflect.getMetadata('path', RuntimeV2ThreadActivityController)).toBe('chat-threads');
    expect(Reflect.getMetadata('path', handler)).toBe(':id/active-run');
    expect(Reflect.getMetadata('method', handler)).toBe(RequestMethod.GET);
  });

  it('asks as the authenticated caller, never as an id from the request', async () => {
    const getActiveRun = vi.fn().mockResolvedValue({ active: false });
    const controller = new RuntimeV2ThreadActivityController({ getActiveRun } as never);

    await expect(controller.getActiveRun('thread-1', { id: 'user-1' } as never)).resolves.toEqual({
      active: false,
    });
    expect(getActiveRun).toHaveBeenCalledWith('user-1', 'thread-1');
  });

  it("passes another owner's 404 through unchanged", async () => {
    const getActiveRun = vi
      .fn()
      .mockRejectedValue(new EntityNotFoundException('ChatThread', 'thread-1'));
    const controller = new RuntimeV2ThreadActivityController({ getActiveRun } as never);

    await expect(
      controller.getActiveRun('thread-1', { id: 'intruder' } as never),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });
});
