import { vi } from 'vitest';

import { InternalAudioController } from '../internal-audio.controller';
import { cancelAudioSchema, linkAudioAssistantMessageSchema } from '../../dto/generate-audio.dto';

describe('InternalAudioController cancel and link', () => {
  const service = {
    cancelGenerationForUser: vi.fn(),
    linkAssistantMessage: vi.fn(),
  };
  const controller = new InternalAudioController(service as never);

  beforeEach(() => vi.clearAllMocks());

  it('cancels as the named owner and returns {id, status, cancelled}', async () => {
    service.cancelGenerationForUser.mockResolvedValue({
      id: 'a1',
      status: 'CANCELLED',
      cancelled: true,
    });

    const result = await controller.cancel('a1', { userId: 'u1' });

    expect(service.cancelGenerationForUser).toHaveBeenCalledWith('a1', 'u1');
    expect(result).toEqual({ id: 'a1', status: 'CANCELLED', cancelled: true });
  });

  it('links the assistant message for the owner', async () => {
    service.linkAssistantMessage.mockResolvedValue(1);

    expect(
      await controller.linkAssistantMessage('a1', { userId: 'u1', assistantMessageId: 'm1' }),
    ).toEqual({
      linked: 1,
    });
    expect(service.linkAssistantMessage).toHaveBeenCalledWith('a1', 'u1', 'm1');
  });

  it('requires userId on cancel and both ids on link', () => {
    expect(cancelAudioSchema.safeParse({}).success).toBe(false);
    expect(cancelAudioSchema.safeParse({ userId: 'u1' }).success).toBe(true);
    expect(linkAudioAssistantMessageSchema.safeParse({ userId: 'u1' }).success).toBe(false);
  });
});
