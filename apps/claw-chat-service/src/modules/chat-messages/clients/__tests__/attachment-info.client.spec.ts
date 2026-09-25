// Multimodal batch 8: attachment lookups before routing are bounded, owner-
// scoped and never throw — an unreadable file is simply left out.

import { vi } from 'vitest';

import { ATTACHMENT_LOOKUP_TIMEOUT_MS } from '../../constants/attachment-modality.constants';
import { AttachmentInfoClient } from '../attachment-info.client';

const { httpRequest } = vi.hoisted(() => ({ httpRequest: vi.fn() }));

vi.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: vi.fn(() => 'Service t'),
  httpRequest,
}));
vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ FILE_SERVICE_URL: 'http://file:4006' }) },
}));

describe('AttachmentInfoClient', () => {
  beforeEach(() => {
    httpRequest.mockReset();
  });

  it('reads each mime type from the cheap readiness endpoint, leaving out failures', async () => {
    httpRequest
      .mockResolvedValueOnce({ ok: true, status: 200, data: { mimeType: 'video/mp4' } })
      .mockResolvedValueOnce({ ok: false, status: 404, data: {} })
      .mockRejectedValueOnce(new Error('timeout'));

    const mimes = await new AttachmentInfoClient().mimeTypes(['a', 'b', 'c'], 'user 1');

    expect(mimes).toEqual(['video/mp4']);
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://file:4006/api/v1/internal/files/a/ingestion-state?userId=user%201',
        headers: { Authorization: 'Service t' },
        timeoutMs: ATTACHMENT_LOOKUP_TIMEOUT_MS,
      }),
    );
  });

  it('asks for the derived text without the bytes', async () => {
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        id: 'a',
        filename: 'clip.mp4',
        mimeType: 'video/mp4',
        content: null,
        extractedText: 'hi',
      },
    });

    const files = await new AttachmentInfoClient().textOnly(['a'], 'u');

    expect(files).toHaveLength(1);
    expect(httpRequest.mock.calls[0]?.[0]).toMatchObject({
      url: 'http://file:4006/api/v1/internal/files/a/content?userId=u&includeContent=false',
    });
  });
});
