import { vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { VideoFailureCode } from '../../../../common/enums';
import { VIDEO_SOURCE_IMAGE_MAX_BYTES } from '../../constants/video-generation.constants';
import { VideoSourceImageManager } from '../video-source-image.manager';

const http = vi.hoisted(() => ({
  httpGet: vi.fn(),
  buildInterServiceAuthHeader: () => 'Service tok',
}));

vi.mock('@common/utilities', () => http);

const PNG_HEAD = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const JPEG_HEAD = Buffer.from('ffd8ffe000104a464946', 'hex');
const WEBP_HEAD = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
]);

describe('VideoSourceImageManager', () => {
  let manager: VideoSourceImageManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      FILE_SERVICE_URL: 'http://file.test',
    } as unknown as ReturnType<typeof AppConfig.get>);
    manager = new VideoSourceImageManager();
  });

  it.each([
    ['image/png', PNG_HEAD],
    ['image/jpeg', JPEG_HEAD],
    ['image/webp', WEBP_HEAD],
  ])('reads %s through the owner-checked route, naming the user', async (mimeType, head) => {
    http.httpGet.mockResolvedValue({ mimeType, content: head.toString('base64') });

    const image = await manager.load('file 1', 'user-1');

    expect(image).toEqual({ base64: head.toString('base64'), mimeType });
    const [url, config] = http.httpGet.mock.calls[0] ?? [];
    expect(url).toBe('http://file.test/api/v1/internal/files/file%201/content?userId=user-1');
    expect(config.headers).toEqual({ Authorization: 'Service tok' });
  });

  it("refuses another user's file: file-service answers 404 for a non-owner", async () => {
    http.httpGet.mockRejectedValue({ response: { status: 404 }, message: 'File not found' });

    await expect(manager.load('file-of-someone-else', 'user-1')).rejects.toMatchObject({
      code: VideoFailureCode.SOURCE_IMAGE_INVALID,
    });
    // The owner id sent is the caller's, never one a client supplied for the file.
    expect(http.httpGet.mock.calls[0]?.[0]).toContain('userId=user-1');
  });

  it.each([
    ['a GIF', 'image/gif', Buffer.from('GIF89a', 'ascii')],
    ['a PDF', 'application/pdf', Buffer.from('%PDF-1.7')],
    ['a PNG declared as JPEG', 'image/jpeg', PNG_HEAD],
    ['a text file declared as PNG', 'image/png', Buffer.from('not an image at all')],
  ])('refuses %s', async (_label, mimeType, bytes) => {
    http.httpGet.mockResolvedValue({ mimeType, content: bytes.toString('base64') });

    await expect(manager.load('file-1', 'user-1')).rejects.toMatchObject({
      code: VideoFailureCode.SOURCE_IMAGE_INVALID,
    });
  });

  it('refuses an image over the size cap', async () => {
    const big = Buffer.concat([PNG_HEAD, Buffer.alloc(VIDEO_SOURCE_IMAGE_MAX_BYTES)]);
    http.httpGet.mockResolvedValue({ mimeType: 'image/png', content: big.toString('base64') });

    await expect(manager.load('file-1', 'user-1')).rejects.toMatchObject({
      code: VideoFailureCode.SOURCE_IMAGE_INVALID,
    });
  });

  it('refuses a file with no bytes', async () => {
    http.httpGet.mockResolvedValue({ mimeType: 'image/png', content: null });

    await expect(manager.load('file-1', 'user-1')).rejects.toMatchObject({
      code: VideoFailureCode.SOURCE_IMAGE_INVALID,
    });
  });
});
