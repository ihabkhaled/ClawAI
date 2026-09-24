import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileDeliveryMode } from '@/enums';
import { fileDeliveryRepository } from '@/repositories/chat/file-delivery.repository';

const mockGet = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

function wire(mode: string, fileId: string): Record<string, unknown> {
  return {
    id: `r-${fileId}`,
    messageId: 'm-1',
    threadId: 't-1',
    userId: 'u-1',
    fileId,
    filename: `${fileId}.bin`,
    mimeType: 'application/octet-stream',
    provider: 'GEMINI',
    model: 'gemini-2.5-flash',
    mode,
    supportsVision: true,
    createdAt: '2026-09-25T00:00:00.000Z',
  };
}

describe('fileDeliveryRepository.getFileDeliveryForMessage', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('keeps every known mode, including the multimodal ones, and drops unknown ones', async () => {
    mockGet.mockResolvedValue({
      data: [
        wire('EXTRACTED_TEXT', 'a'),
        wire('TRANSCRIPT', 'b'),
        wire('NATIVE_VIDEO', 'c'),
        wire('STILL_PROCESSING', 'd'),
        wire('FAILED_PROCESSING', 'e'),
        wire('SOMETHING_NEW', 'f'),
      ],
    });

    const entries = await fileDeliveryRepository.getFileDeliveryForMessage('m-1');

    expect(mockGet).toHaveBeenCalledWith('/chat-messages/m-1/file-delivery');
    expect(entries.map((item) => item.mode)).toEqual([
      FileDeliveryMode.EXTRACTED_TEXT,
      FileDeliveryMode.TRANSCRIPT,
      FileDeliveryMode.NATIVE_VIDEO,
      FileDeliveryMode.STILL_PROCESSING,
      FileDeliveryMode.FAILED_PROCESSING,
    ]);
  });
});
