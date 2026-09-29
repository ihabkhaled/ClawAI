// Batch 10a: chat links the stored assistant message to its image generation.
// Best-effort — every failure is a `false`, never an exception into the turn.

import { vi } from 'vitest';

import { IMAGE_ASSISTANT_MESSAGE_LINK_TIMEOUT_MS } from '../../constants/image-generation-link.constants';
import { ImageGenerationLinkClient } from '../image-generation-link.client';

const { httpRequest } = vi.hoisted(() => ({ httpRequest: vi.fn() }));

vi.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: vi.fn(() => 'Service t'),
  httpRequest,
}));
vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ IMAGE_SERVICE_URL: 'http://image:4012' }) },
}));

describe('ImageGenerationLinkClient', () => {
  beforeEach(() => {
    httpRequest.mockReset();
  });

  it('posts the owner and message id with the service token, bounded', async () => {
    httpRequest.mockResolvedValue({ ok: true, status: 200, data: { linked: 1 } });

    const linked = await new ImageGenerationLinkClient().linkAssistantMessage(
      'gen 1',
      'user-1',
      'msg-1',
    );

    expect(httpRequest).toHaveBeenCalledWith({
      url: 'http://image:4012/api/v1/internal/images/gen%201/assistant-message',
      method: 'POST',
      headers: { Authorization: 'Service t' },
      body: { userId: 'user-1', assistantMessageId: 'msg-1' },
      timeoutMs: IMAGE_ASSISTANT_MESSAGE_LINK_TIMEOUT_MS,
    });
    expect(linked).toBe(true);
  });

  it.each([
    ['nothing linked (foreign or already linked)', { ok: true, status: 200, data: { linked: 0 } }],
    ['a non-2xx answer', { ok: false, status: 401, data: {} }],
  ])('returns false for %s', async (_name, response) => {
    httpRequest.mockResolvedValue(response);

    await expect(new ImageGenerationLinkClient().linkAssistantMessage('g', 'u', 'm')).resolves.toBe(
      false,
    );
  });

  it('returns false when image-service is unreachable', async () => {
    httpRequest.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(new ImageGenerationLinkClient().linkAssistantMessage('g', 'u', 'm')).resolves.toBe(
      false,
    );
  });
});
